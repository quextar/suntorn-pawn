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
