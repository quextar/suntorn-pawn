-- สุนทรการค้า: ตั้งฐานข้อมูลทั้งหมดในไฟล์เดียว (สำหรับฐานข้อมูลว่าง)
-- รวม 0001, 0002, 0003, seed, 0004, 0005

-- ===== 0001_init.sql =====
-- สุนทรการค้า: โครงสร้างพื้นฐาน (สัปดาห์ที่ 1)
-- บทบาท: ceo เห็น/แก้ได้ทุกอย่าง, staff = พนักงานหน้าร้านที่ทำหน้าที่คลังด้วย

create type user_role as enum ('ceo', 'staff');
create type contract_status as enum ('active', 'redeemed', 'forfeited');

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid not null references branches(id),
  full_name text not null,
  role user_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- ตั้งค่าที่ CEO แก้ได้ (ดอกเบี้ย อายุสัญญา ผ่อนผัน) ไม่ฝังในโค้ด
create table settings (
  branch_id uuid not null references branches(id),
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (branch_id, key)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  full_name text not null,
  national_id text not null,
  phone text,
  address text,
  id_card_photo_path text,
  is_blacklisted boolean not null default false,
  blacklist_reason text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (branch_id, national_id)
);

-- ประวัติทุกการเปลี่ยนแปลง ไม่ลบ ไม่แก้
create table audit_log (
  id bigint generated always as identity primary key,
  branch_id uuid,
  actor uuid references profiles(id),
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create function current_role_name() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function current_branch() returns uuid
language sql stable security definer set search_path = public as
$$ select branch_id from profiles where id = auth.uid() $$;

create function write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(branch_id, actor, table_name, row_id, action, old_data, new_data)
  values (
    coalesce((to_jsonb(new)->>'branch_id')::uuid, (to_jsonb(old)->>'branch_id')::uuid),
    auth.uid(), tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger customers_audit after insert or update or delete on customers
for each row execute function write_audit();
create trigger settings_audit after insert or update or delete on settings
for each row execute function write_audit();

alter table branches enable row level security;
alter table profiles enable row level security;
alter table settings enable row level security;
alter table customers enable row level security;
alter table audit_log enable row level security;

create policy branches_read on branches for select using (id = current_branch());

create policy profiles_read on profiles for select
  using (branch_id = current_branch());
create policy profiles_ceo_write on profiles for all
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());

create policy settings_read on settings for select using (branch_id = current_branch());
create policy settings_ceo_write on settings for all
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());

-- พนักงานเพิ่มและดูลูกค้าได้ แก้ไข/ลบได้เฉพาะ CEO
create policy customers_read on customers for select using (branch_id = current_branch());
create policy customers_staff_insert on customers for insert
  with check (branch_id = current_branch());
create policy customers_ceo_update on customers for update
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());
create policy customers_ceo_delete on customers for delete
  using (current_role_name() = 'ceo' and branch_id = current_branch());

create policy audit_ceo_read on audit_log for select
  using (current_role_name() = 'ceo' and branch_id = current_branch());

-- ===== 0002_id_card_storage.sql =====
-- ที่เก็บรูปบัตรประชาชน (ไม่เปิดสาธารณะ)
insert into storage.buckets (id, name, public) values ('id-cards', 'id-cards', false)
on conflict (id) do nothing;

create policy id_cards_read on storage.objects for select
  using (bucket_id = 'id-cards' and (storage.foldername(name))[1] = current_branch()::text);
create policy id_cards_insert on storage.objects for insert
  with check (bucket_id = 'id-cards' and (storage.foldername(name))[1] = current_branch()::text);

-- ===== 0003_lock_down_functions.sql =====
-- ปิดการเรียกฟังก์ชันตรวจสิทธิ์จากภายนอก (ตามคำเตือนของ Supabase advisor)
-- ผู้ใช้ที่ล็อกอินแล้วยังต้องเรียกได้ เพราะ RLS policy ใช้ฟังก์ชันเหล่านี้
revoke execute on function current_role_name() from public, anon;
revoke execute on function current_branch() from public, anon;
grant execute on function current_role_name() to authenticated;
grant execute on function current_branch() to authenticated;

-- write_audit ถูกเรียกผ่าน trigger เท่านั้น ไม่ต้องให้ใครเรียกตรง
revoke execute on function write_audit() from public, anon, authenticated;

-- ===== seed.sql =====
-- ข้อมูลเริ่มต้น: สาขาและค่าตั้งค่า รันครั้งเดียว
do $$
declare
  b uuid;
begin
  if exists (select 1 from branches) then
    raise exception 'มีสาขาอยู่แล้ว ไม่ต้องรันไฟล์นี้ซ้ำ';
  end if;

  insert into branches (name) values ('สุนทรการค้า สาขาหลัก') returning id into b;

  -- ค่าชั่วคราว ปรับภายหลังได้ (CEO เท่านั้น)
  insert into settings (branch_id, key, value) values
    (b, 'contract_term_months', '4'),
    (b, 'grace_period_days', '30'),
    (b, 'interest_rate_percent_per_month', '2'),
    (b, 'interest_calc', '"daily"'),
    (b, 'ticket_paper', '"A4"');
end $$;

-- ===== 0004_auto_profile.sql =====
-- สร้างโปรไฟล์ให้อัตโนมัติเมื่อเพิ่มผู้ใช้ใน Authentication (แบบเดียวกับ POS Songkran)
-- ผู้ใช้ใหม่เป็น staff เสมอ CEO ต้องตั้งผ่าน SQL หรือ Table Editor เท่านั้น
-- ไม่ใช้ user_metadata.role เพราะผู้ใช้แก้เองได้

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b uuid := (select id from branches order by created_at limit 1);
begin
  if b is not null then
    insert into profiles (id, branch_id, full_name, role)
    values (new.id, b, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)), 'staff')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

revoke execute on function handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ผู้ใช้ที่สร้างไว้ก่อนแล้วแต่ยังไม่มีโปรไฟล์: เติมให้เป็น staff
insert into profiles (id, branch_id, full_name, role)
select u.id, (select id from branches order by created_at limit 1), split_part(u.email, '@', 1), 'staff'
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id)
  and exists (select 1 from branches);

-- ===== 0005_pawn_core.sql =====
-- สุนทรการค้า: ระบบรับจำนำ สัญญา คลัง ตรวจนับ ปิดยอด (สัปดาห์ 2-4)
-- รันต่อจาก setup_all.sql ได้เลย รันซ้ำไม่ได้
-- การเปลี่ยนสถานะสัญญาทั้งหมดทำผ่านฟังก์ชันด้านล่าง ฟังก์ชันตรวจสิทธิ์และคำนวณเงินเอง
-- พนักงานจึงแก้ตัวเลขในตารางตรงๆ ไม่ได้

-- ===== วันที่ตามเวลาไทย =====
create function today_th() returns date
language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date $$;

-- ===== หมวดสินค้า + เช็กลิสต์ทดสอบ =====
create table item_categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  checklist text[] not null default '{}',
  sort int not null default 0,
  unique (branch_id, name)
);

-- ===== ตำแหน่งเก็บ โซน-ชั้น-ช่อง =====
create table locations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  zone text not null,
  shelf text not null,
  slot text not null,
  code text generated always as (zone || '-' || shelf || '-' || slot) stored,
  note text,
  created_at timestamptz not null default now(),
  unique (branch_id, zone, shelf, slot)
);

-- ===== สินค้า =====
create table items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id),
  category_id uuid references item_categories(id),
  name text not null,
  brand text,
  model text,
  serial_no text,
  description text,
  checklist jsonb not null default '{}',
  photos text[] not null default '{}',
  -- pending รออนุมัติ, in_storage อยู่ในคลัง, redeemed ไถ่ถอนแล้ว, forfeited หลุดจำนำ(รอขาย)
  status text not null default 'pending'
    check (status in ('pending', 'rejected', 'in_storage', 'redeemed', 'forfeited', 'cancelled')),
  location_id uuid references locations(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ===== สัญญา =====
create sequence contract_no_seq;

create table contracts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  contract_no text not null unique default 'PN-' || lpad(nextval('contract_no_seq')::text, 6, '0'),
  customer_id uuid not null references customers(id),
  item_id uuid not null unique references items(id),
  appraised_value numeric(12, 2) not null check (appraised_value > 0),
  requested_amount numeric(12, 2) not null check (requested_amount > 0),
  principal numeric(12, 2) check (principal > 0),
  -- ค่าจากหน้าตั้งค่า ณ วันทำสัญญา เปลี่ยนตั้งค่าภายหลังไม่กระทบสัญญาเดิม
  interest_rate numeric(5, 2) not null,
  interest_calc text not null default 'daily' check (interest_calc in ('daily', 'monthly')),
  term_months int not null,
  grace_days int not null,
  start_date date,
  due_date date,
  interest_paid_until date,
  status text not null default 'pending'
    check (status in ('pending', 'rejected', 'active', 'redeemed', 'forfeited', 'cancelled')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  decision_note text,
  closed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index contracts_status_due on contracts (branch_id, status, due_date);

-- ===== รายการเงิน (ไม่ลบ ไม่แก้) =====
create table contract_transactions (
  id bigint generated always as identity primary key,
  branch_id uuid not null references branches(id),
  contract_id uuid not null references contracts(id),
  -- loan จ่ายเงินกู้, interest ต่อดอก, reduce ลดต้น, add เพิ่มต้น, redeem ไถ่ถอน, forfeit หลุดจำนำ, cancel ยกเลิก
  kind text not null check (kind in ('loan', 'interest', 'reduce', 'add', 'redeem', 'forfeit', 'cancel')),
  principal_amount numeric(12, 2) not null default 0,
  interest_amount numeric(12, 2) not null default 0,
  interest_days int,
  cash_in numeric(12, 2) not null default 0,
  cash_out numeric(12, 2) not null default 0,
  principal_after numeric(12, 2),
  due_date_after date,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index contract_transactions_contract on contract_transactions (contract_id, created_at);
create index contract_transactions_day on contract_transactions (branch_id, created_at);

-- ===== ประวัติย้ายของ =====
create table item_movements (
  id bigint generated always as identity primary key,
  branch_id uuid not null references branches(id),
  item_id uuid not null references items(id),
  from_location uuid references locations(id),
  to_location uuid references locations(id),
  note text,
  moved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ===== ตรวจนับสต๊อก =====
create table stock_counts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  status text not null default 'open' check (status in ('open', 'closed')),
  expected_count int,
  found_count int,
  note text,
  started_by uuid references profiles(id),
  started_at timestamptz not null default now(),
  closed_by uuid references profiles(id),
  closed_at timestamptz
);
create unique index one_open_count_per_branch on stock_counts (branch_id) where status = 'open';

create table stock_count_scans (
  count_id uuid not null references stock_counts(id),
  item_id uuid not null references items(id),
  location_id uuid references locations(id),
  scanned_by uuid references profiles(id),
  scanned_at timestamptz not null default now(),
  primary key (count_id, item_id)
);

-- ===== ปิดยอดเงินสดรายวัน =====
create table cash_closings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  close_date date not null,
  opening_cash numeric(12, 2) not null default 0,
  cash_in numeric(12, 2) not null,
  cash_out numeric(12, 2) not null,
  expected_cash numeric(12, 2) not null,
  counted_cash numeric(12, 2) not null,
  difference numeric(12, 2) generated always as (counted_cash - expected_cash) stored,
  note text,
  closed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (branch_id, close_date)
);

-- ===== ประวัติการเปลี่ยนแปลง =====
create trigger items_audit after insert or update or delete on items
for each row execute function write_audit();
create trigger contracts_audit after insert or update or delete on contracts
for each row execute function write_audit();
create trigger locations_audit after insert or update or delete on locations
for each row execute function write_audit();
create trigger item_categories_audit after insert or update or delete on item_categories
for each row execute function write_audit();
create trigger cash_closings_audit after insert or update or delete on cash_closings
for each row execute function write_audit();

-- ===== สิทธิ์ (RLS) =====
alter table item_categories enable row level security;
alter table locations enable row level security;
alter table items enable row level security;
alter table contracts enable row level security;
alter table contract_transactions enable row level security;
alter table item_movements enable row level security;
alter table stock_counts enable row level security;
alter table stock_count_scans enable row level security;
alter table cash_closings enable row level security;

-- ทุกคนในสาขาอ่านได้
create policy item_categories_read on item_categories for select using (branch_id = current_branch());
create policy locations_read on locations for select using (branch_id = current_branch());
create policy items_read on items for select using (branch_id = current_branch());
create policy contracts_read on contracts for select using (branch_id = current_branch());
create policy contract_transactions_read on contract_transactions for select using (branch_id = current_branch());
create policy item_movements_read on item_movements for select using (branch_id = current_branch());
create policy stock_counts_read on stock_counts for select using (branch_id = current_branch());
create policy stock_count_scans_read on stock_count_scans for select
  using (exists (select 1 from stock_counts s where s.id = count_id and s.branch_id = current_branch()));
create policy cash_closings_read on cash_closings for select using (branch_id = current_branch());

-- หมวดสินค้า: CEO จัดการ
create policy item_categories_ceo_write on item_categories for all
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());

-- ตำแหน่ง: พนักงานเพิ่มได้ แก้/ลบได้เฉพาะ CEO
create policy locations_insert on locations for insert with check (branch_id = current_branch());
create policy locations_ceo_update on locations for update
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());
create policy locations_ceo_delete on locations for delete
  using (current_role_name() = 'ceo' and branch_id = current_branch());

-- ปิดยอด: CEO แก้ยอดที่ปิดแล้วได้
create policy cash_closings_ceo_update on cash_closings for update
  using (current_role_name() = 'ceo' and branch_id = current_branch())
  with check (current_role_name() = 'ceo' and branch_id = current_branch());

-- items, contracts, transactions, movements, counts: เขียนผ่านฟังก์ชันด้านล่างเท่านั้น

-- ===== รูปสินค้า =====
insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;

create policy item_photos_read on storage.objects for select
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = current_branch()::text);
create policy item_photos_insert on storage.objects for insert
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = current_branch()::text);

-- ===== คำนวณดอกเบี้ยค้าง ณ วันที่กำหนด (ปัดเป็นบาท) =====
create function interest_due(c contracts, on_date date default today_th())
returns table (days int, amount numeric)
language sql stable as $$
  select d, case
    when c.status <> 'active' or c.principal is null or d <= 0 then 0
    when c.interest_calc = 'monthly' then round(c.principal * c.interest_rate / 100 * ceil(d / 30.0))
    else round(c.principal * c.interest_rate / 100 * d / 30)
  end
  from (select greatest(on_date - c.interest_paid_until, 0) as d) x
$$;

-- ให้หน้าเว็บถามดอกเบี้ยค้างของสัญญาได้
create function contract_interest_due(p_id uuid, p_on date default today_th())
returns table (days int, amount numeric)
language sql stable security definer set search_path = public as $$
  select i.* from contracts c, interest_due(c, p_on) i
  where c.id = p_id and c.branch_id = current_branch()
$$;

-- ===== ตัวช่วยภายใน =====
create function _me() returns profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null then raise exception 'ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่'; end if;
  return p;
end $$;

create function _contract_for_update(p_id uuid, p_status text) returns contracts
language plpgsql security definer set search_path = public as $$
declare c contracts;
begin
  select * into c from contracts where id = p_id and branch_id = current_branch() for update;
  if c.id is null then raise exception 'ไม่พบสัญญา'; end if;
  if p_status is not null and c.status <> p_status then
    raise exception 'สัญญานี้อยู่ในสถานะ % ทำรายการนี้ไม่ได้', c.status;
  end if;
  return c;
end $$;

-- ===== 1. รับจำนำ: พนักงานบันทึกสินค้า + เสนอราคา รอ CEO อนุมัติ =====
create function create_pawn(
  p_customer uuid, p_category uuid, p_name text, p_brand text, p_model text, p_serial text,
  p_description text, p_checklist jsonb, p_photos text[], p_appraised numeric, p_requested numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  cust customers;
  item_id uuid;
  contract_id uuid;
  s jsonb;
begin
  select * into cust from customers where id = p_customer and branch_id = me.branch_id;
  if cust.id is null then raise exception 'ไม่พบลูกค้า'; end if;
  if cust.is_blacklisted then raise exception 'ลูกค้าอยู่ในบัญชีดำ รับจำนำไม่ได้'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'กรุณากรอกชื่อสินค้า'; end if;
  if p_appraised is null or p_appraised <= 0 then raise exception 'กรุณากรอกราคาประเมิน'; end if;
  if p_requested is null or p_requested <= 0 then raise exception 'กรุณากรอกยอดที่ลูกค้าขอ'; end if;

  select jsonb_object_agg(key, value) into s from settings where branch_id = me.branch_id;

  insert into items (branch_id, customer_id, category_id, name, brand, model, serial_no, description, checklist, photos, created_by)
  values (me.branch_id, cust.id, p_category, trim(p_name), nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
          nullif(trim(p_serial), ''), nullif(trim(p_description), ''), coalesce(p_checklist, '{}'),
          coalesce(p_photos, '{}'), me.id)
  returning id into item_id;

  insert into contracts (branch_id, customer_id, item_id, appraised_value, requested_amount,
                         interest_rate, interest_calc, term_months, grace_days, created_by)
  values (me.branch_id, cust.id, item_id, p_appraised, p_requested,
          coalesce((s->>'interest_rate_percent_per_month')::numeric, 2),
          coalesce(s->>'interest_calc', 'daily'),
          coalesce((s->>'contract_term_months')::int, 4),
          coalesce((s->>'grace_period_days')::int, 30),
          me.id)
  returning id into contract_id;
  return contract_id;
end $$;

-- ===== 2. CEO อนุมัติวงเงิน (จ่ายเงินกู้) หรือไม่อนุมัติ =====
create function decide_contract(p_id uuid, p_approve boolean, p_principal numeric, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'pending');
  d date := today_th();
begin
  if me.role <> 'ceo' then raise exception 'เฉพาะผู้บริหารเท่านั้นที่อนุมัติวงเงินได้'; end if;
  if p_approve then
    if p_principal is null or p_principal <= 0 then raise exception 'กรุณากรอกวงเงินที่อนุมัติ'; end if;
    update contracts set status = 'active', principal = p_principal, start_date = d,
      due_date = (d + make_interval(months => term_months))::date, interest_paid_until = d,
      decided_by = me.id, decided_at = now(), decision_note = nullif(trim(p_note), '')
    where id = c.id returning * into c;
    update items set status = 'in_storage' where id = c.item_id;
    insert into contract_transactions (branch_id, contract_id, kind, principal_amount, cash_out, principal_after, due_date_after, note, created_by)
    values (c.branch_id, c.id, 'loan', p_principal, p_principal, p_principal, c.due_date, 'จ่ายเงินกู้', me.id);
  else
    update contracts set status = 'rejected', decided_by = me.id, decided_at = now(),
      decision_note = nullif(trim(p_note), ''), closed_at = now()
    where id = c.id;
    update items set status = 'rejected' where id = c.item_id;
  end if;
end $$;

-- ===== 3. ต่อดอก: จ่ายดอกถึงวันนี้ ขยายครบกำหนดอีก 1 รอบสัญญานับจากวันนี้ =====
create function renew_contract(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
  i record;
  d date := today_th();
  new_due date;
begin
  select * into i from interest_due(c, d);
  new_due := (d + make_interval(months => c.term_months))::date;
  update contracts set interest_paid_until = d, due_date = new_due where id = c.id;
  insert into contract_transactions (branch_id, contract_id, kind, interest_amount, interest_days, cash_in, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'interest', i.amount, i.days, i.amount, c.principal, new_due, 'ต่อดอก', me.id);
end $$;

-- ===== 4. ลดต้น: จ่ายดอกถึงวันนี้ + คืนเงินต้นบางส่วน =====
create function reduce_principal(p_id uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
  i record;
  d date := today_th();
begin
  if p_amount is null or p_amount <= 0 then raise exception 'กรุณากรอกจำนวนเงินที่ลด'; end if;
  if p_amount >= c.principal then raise exception 'ลดต้นได้ไม่เกินเงินต้น ถ้าจ่ายครบให้ใช้ไถ่ถอน'; end if;
  select * into i from interest_due(c, d);
  update contracts set principal = principal - p_amount, interest_paid_until = d where id = c.id;
  insert into contract_transactions (branch_id, contract_id, kind, principal_amount, interest_amount, interest_days, cash_in, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'reduce', p_amount, i.amount, i.days, p_amount + i.amount, c.principal - p_amount, c.due_date, 'ลดต้น', me.id);
end $$;

-- ===== 5. เพิ่มต้น (CEO เท่านั้น): เก็บดอกถึงวันนี้ จ่ายเงินเพิ่ม =====
create function add_principal(p_id uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
  i record;
  d date := today_th();
begin
  if me.role <> 'ceo' then raise exception 'เฉพาะผู้บริหารเท่านั้นที่เพิ่มเงินต้นได้'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'กรุณากรอกจำนวนเงินที่เพิ่ม'; end if;
  select * into i from interest_due(c, d);
  update contracts set principal = principal + p_amount, interest_paid_until = d where id = c.id;
  insert into contract_transactions (branch_id, contract_id, kind, principal_amount, interest_amount, interest_days, cash_in, cash_out, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'add', p_amount, i.amount, i.days, i.amount, p_amount, c.principal + p_amount, c.due_date, 'เพิ่มต้น', me.id);
end $$;

-- ===== 6. ไถ่ถอน: จ่ายต้น + ดอก รับของคืน =====
create function redeem_contract(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
  it items;
  i record;
  d date := today_th();
begin
  select * into i from interest_due(c, d);
  select * into it from items where id = c.item_id for update;
  update contracts set status = 'redeemed', interest_paid_until = d, closed_at = now() where id = c.id;
  update items set status = 'redeemed', location_id = null where id = it.id;
  if it.location_id is not null then
    insert into item_movements (branch_id, item_id, from_location, to_location, note, moved_by)
    values (it.branch_id, it.id, it.location_id, null, 'ไถ่ถอน คืนลูกค้า', me.id);
  end if;
  insert into contract_transactions (branch_id, contract_id, kind, principal_amount, interest_amount, interest_days, cash_in, principal_after, note, created_by)
  values (c.branch_id, c.id, 'redeem', c.principal, i.amount, i.days, c.principal + i.amount, 0, 'ไถ่ถอน', me.id);
end $$;

-- ===== 7. หลุดจำนำ: พ้นกำหนด + ผ่อนผันแล้ว (CEO สั่งได้ก่อนถ้าจำเป็น) =====
create function forfeit_contract(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
begin
  if me.role <> 'ceo' and today_th() <= c.due_date + c.grace_days then
    raise exception 'ยังไม่พ้นระยะผ่อนผัน (ถึง %)', to_char(c.due_date + c.grace_days, 'DD/MM/YYYY');
  end if;
  update contracts set status = 'forfeited', closed_at = now() where id = c.id;
  update items set status = 'forfeited' where id = c.item_id;
  insert into contract_transactions (branch_id, contract_id, kind, principal_after, note, created_by)
  values (c.branch_id, c.id, 'forfeit', c.principal, 'หลุดจำนำ สินค้ารอขาย', me.id);
end $$;

-- ===== 8. ยกเลิกสัญญา (CEO เท่านั้น) =====
create function cancel_contract(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, null);
begin
  if me.role <> 'ceo' then raise exception 'เฉพาะผู้บริหารเท่านั้นที่ยกเลิกสัญญาได้'; end if;
  if c.status not in ('pending', 'active') then raise exception 'ยกเลิกได้เฉพาะสัญญาที่รออนุมัติหรือดำเนินอยู่'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'กรุณาระบุเหตุผลที่ยกเลิก'; end if;
  update contracts set status = 'cancelled', closed_at = now(), decision_note = trim(p_reason) where id = c.id;
  update items set status = 'cancelled', location_id = null where id = c.item_id;
  insert into contract_transactions (branch_id, contract_id, kind, principal_after, note, created_by)
  values (c.branch_id, c.id, 'cancel', c.principal, 'ยกเลิก: ' || trim(p_reason), me.id);
end $$;

-- ===== 9. ย้ายของเข้าตำแหน่ง =====
create function move_item(p_item uuid, p_location uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  it items;
begin
  select * into it from items where id = p_item and branch_id = me.branch_id for update;
  if it.id is null then raise exception 'ไม่พบสินค้า'; end if;
  if it.status not in ('in_storage', 'forfeited') then raise exception 'สินค้านี้ไม่ได้อยู่ในคลัง'; end if;
  if p_location is not null and not exists (select 1 from locations where id = p_location and branch_id = me.branch_id) then
    raise exception 'ไม่พบตำแหน่ง';
  end if;
  if it.location_id is not distinct from p_location then return; end if;
  update items set location_id = p_location where id = it.id;
  insert into item_movements (branch_id, item_id, from_location, to_location, note, moved_by)
  values (me.branch_id, it.id, it.location_id, p_location, nullif(trim(p_note), ''), me.id);
end $$;

-- ===== 10. ตรวจนับสต๊อก =====
create function start_stock_count() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  sid uuid;
begin
  select id into sid from stock_counts where branch_id = me.branch_id and status = 'open';
  if sid is not null then return sid; end if;
  insert into stock_counts (branch_id, expected_count, started_by)
  values (me.branch_id, (select count(*) from items where branch_id = me.branch_id and status in ('in_storage', 'forfeited')), me.id)
  returning id into sid;
  return sid;
end $$;

create function scan_stock_item(p_count uuid, p_item uuid, p_location uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  it items;
begin
  if not exists (select 1 from stock_counts where id = p_count and branch_id = me.branch_id and status = 'open') then
    raise exception 'รอบตรวจนับนี้ปิดแล้ว';
  end if;
  select * into it from items where id = p_item and branch_id = me.branch_id;
  if it.id is null then raise exception 'ไม่พบสินค้า'; end if;
  insert into stock_count_scans (count_id, item_id, location_id, scanned_by)
  values (p_count, it.id, coalesce(p_location, it.location_id), me.id)
  on conflict (count_id, item_id) do update set location_id = excluded.location_id, scanned_at = now(), scanned_by = excluded.scanned_by;
  if it.status not in ('in_storage', 'forfeited') then
    return 'สินค้านี้สถานะ ' || it.status || ' ไม่ควรอยู่ในคลัง';
  end if;
  if p_location is not null and it.location_id is distinct from p_location then
    return 'พบสินค้าคนละตำแหน่งกับที่บันทึกไว้';
  end if;
  return 'ok';
end $$;

create function close_stock_count(p_count uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _me();
begin
  update stock_counts set status = 'closed', closed_by = me.id, closed_at = now(), note = nullif(trim(p_note), ''),
    found_count = (select count(*) from stock_count_scans s join items i on i.id = s.item_id
                   where s.count_id = p_count and i.status in ('in_storage', 'forfeited'))
  where id = p_count and branch_id = me.branch_id and status = 'open';
  if not found then raise exception 'รอบตรวจนับนี้ปิดแล้ว'; end if;
end $$;

-- ===== 11. ปิดยอดเงินสดรายวัน =====
create function cash_summary(p_date date)
returns table (cash_in numeric, cash_out numeric, tx_count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(t.cash_in), 0), coalesce(sum(t.cash_out), 0), count(*)
  from contract_transactions t
  where t.branch_id = current_branch()
    and (t.created_at at time zone 'Asia/Bangkok')::date = p_date
$$;

create function close_cash(p_date date, p_opening numeric, p_counted numeric, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  s record;
begin
  if p_date > today_th() then raise exception 'ปิดยอดล่วงหน้าไม่ได้'; end if;
  if p_counted is null then raise exception 'กรุณากรอกเงินสดที่นับได้'; end if;
  if exists (select 1 from cash_closings where branch_id = me.branch_id and close_date = p_date) and me.role <> 'ceo' then
    raise exception 'วันนี้ปิดยอดไปแล้ว ให้ผู้บริหารแก้ไข';
  end if;
  select * into s from cash_summary(p_date);
  insert into cash_closings (branch_id, close_date, opening_cash, cash_in, cash_out, expected_cash, counted_cash, note, closed_by)
  values (me.branch_id, p_date, coalesce(p_opening, 0), s.cash_in, s.cash_out,
          coalesce(p_opening, 0) + s.cash_in - s.cash_out, p_counted, nullif(trim(p_note), ''), me.id)
  on conflict (branch_id, close_date) do update set
    opening_cash = excluded.opening_cash, cash_in = excluded.cash_in, cash_out = excluded.cash_out,
    expected_cash = excluded.expected_cash, counted_cash = excluded.counted_cash, note = excluded.note,
    closed_by = excluded.closed_by, created_at = now();
end $$;

-- ===== สิทธิ์เรียกฟังก์ชัน: เฉพาะผู้ใช้ที่ล็อกอินแล้ว =====
revoke execute on function
  today_th(), interest_due(contracts, date), contract_interest_due(uuid, date), _me(), _contract_for_update(uuid, text),
  create_pawn(uuid, uuid, text, text, text, text, text, jsonb, text[], numeric, numeric),
  decide_contract(uuid, boolean, numeric, text), renew_contract(uuid), reduce_principal(uuid, numeric),
  add_principal(uuid, numeric), redeem_contract(uuid), forfeit_contract(uuid), cancel_contract(uuid, text),
  move_item(uuid, uuid, text), start_stock_count(), scan_stock_item(uuid, uuid, uuid),
  close_stock_count(uuid, text), cash_summary(date), close_cash(date, numeric, numeric, text)
from public, anon;
revoke execute on function _me(), _contract_for_update(uuid, text) from authenticated;
grant execute on function
  today_th(), interest_due(contracts, date), contract_interest_due(uuid, date),
  create_pawn(uuid, uuid, text, text, text, text, text, jsonb, text[], numeric, numeric),
  decide_contract(uuid, boolean, numeric, text), renew_contract(uuid), reduce_principal(uuid, numeric),
  add_principal(uuid, numeric), redeem_contract(uuid), forfeit_contract(uuid), cancel_contract(uuid, text),
  move_item(uuid, uuid, text), start_stock_count(), scan_stock_item(uuid, uuid, uuid),
  close_stock_count(uuid, text), cash_summary(date), close_cash(date, numeric, numeric, text)
to authenticated;

-- ===== ข้อมูลเริ่มต้น: หมวดสินค้า (ไม่รับทอง) และตำแหน่งตัวอย่าง =====
insert into item_categories (branch_id, name, checklist, sort)
select b.id, c.name, c.checklist, c.sort
from branches b
cross join (values
  ('โทรศัพท์มือถือ', array['เปิดเครื่องติด', 'หน้าจอไม่แตก', 'ทัชสกรีนใช้ได้', 'กล้องใช้ได้', 'ออกจากบัญชี iCloud / Google แล้ว', 'มีที่ชาร์จ', 'มีกล่อง'], 1),
  ('โน้ตบุ๊ก / แท็บเล็ต', array['เปิดเครื่องติด', 'หน้าจอปกติ', 'คีย์บอร์ด / ทัชใช้ได้', 'แบตเตอรี่ชาร์จเข้า', 'ลบรหัสผ่านแล้ว', 'มีที่ชาร์จ'], 2),
  ('นาฬิกา', array['เดินปกติ', 'กระจกไม่แตก', 'มีใบรับประกัน', 'มีกล่อง'], 3),
  ('กล้อง / เลนส์', array['เปิดเครื่องติด', 'ถ่ายภาพได้', 'เลนส์ไม่มีรา / ฝ้า', 'มีแบตเตอรี่', 'มีที่ชาร์จ'], 4),
  ('เครื่องใช้ไฟฟ้า', array['เปิดติด', 'ทำงานปกติ', 'มีสายไฟ / รีโมต'], 5),
  ('เครื่องมือช่าง', array['ทำงานปกติ', 'มีแบตเตอรี่', 'มีที่ชาร์จ'], 6),
  ('เครื่องดนตรี', array['เล่นได้ปกติ', 'ไม่มีรอยร้าว'], 7),
  ('อื่นๆ', array['ตรวจสภาพแล้ว'], 99)
) as c(name, checklist, sort)
on conflict (branch_id, name) do nothing;

insert into locations (branch_id, zone, shelf, slot)
select b.id, z, s, lpad(n::text, 2, '0')
from branches b, unnest(array['A', 'B']) z, unnest(array['1', '2']) s, generate_series(1, 5) n
on conflict do nothing;
