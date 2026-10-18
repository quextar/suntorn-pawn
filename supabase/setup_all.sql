-- สุนทรการค้า: ตั้งฐานข้อมูลทั้งหมดในไฟล์เดียว (สำหรับฐานข้อมูลว่าง)
-- รวม 0001, 0002, 0003, seed, 0004

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
