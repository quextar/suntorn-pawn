-- ล้างฐานข้อมูลของระบบสุนทรการค้าทั้งหมด เพื่อเริ่มใหม่ด้วย setup_all.sql
-- ลบข้อมูลลูกค้า สัญญา สินค้า ค่าตั้งค่า สาขา และประวัติทั้งหมด (บัญชีล็อกอินใน Authentication ยังอยู่)
-- รูปที่อัปโหลดไว้ยังอยู่ในหน้า Storage ลบเองได้ถ้าต้องการ
-- ใช้เฉพาะตอนยังไม่มีข้อมูลจริง ย้อนกลับไม่ได้

drop trigger if exists on_auth_user_created on auth.users;
drop policy if exists id_cards_read on storage.objects;
drop policy if exists id_cards_insert on storage.objects;
drop policy if exists item_photos_read on storage.objects;
drop policy if exists item_photos_insert on storage.objects;
drop table if exists cash_closings, stock_count_scans, stock_counts, item_movements, contract_transactions,
  contracts, items, locations, item_categories cascade;
drop sequence if exists contract_no_seq;
drop function if exists create_pawn, decide_contract, renew_contract, reduce_principal, add_principal,
  redeem_contract, forfeit_contract, cancel_contract, move_item, start_stock_count, scan_stock_item,
  close_stock_count, cash_summary, close_cash, contract_interest_due, interest_due, _contract_for_update, _me,
  add_fee, _paid_until_after, months_due, today_th cascade;
drop table if exists audit_log, customers, settings, profiles, branches cascade;
drop function if exists handle_new_user(), write_audit(), current_role_name(), current_branch() cascade;
drop type if exists contract_status, user_role cascade;
