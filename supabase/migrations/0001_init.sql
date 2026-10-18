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
