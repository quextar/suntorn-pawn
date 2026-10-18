-- ล้างฐานข้อมูลของระบบสุนทรการค้าทั้งหมด เพื่อเริ่มใหม่ด้วย setup_all.sql
-- ลบข้อมูลลูกค้า ค่าตั้งค่า สาขา และประวัติทั้งหมด (บัญชีล็อกอินใน Authentication ยังอยู่)
-- ใช้เฉพาะตอนยังไม่มีข้อมูลจริง ย้อนกลับไม่ได้

drop trigger if exists on_auth_user_created on auth.users;
drop policy if exists id_cards_read on storage.objects;
drop policy if exists id_cards_insert on storage.objects;
drop table if exists audit_log, customers, settings, profiles, branches cascade;
drop function if exists handle_new_user(), write_audit(), current_role_name(), current_branch() cascade;
drop type if exists contract_status, user_role cascade;
