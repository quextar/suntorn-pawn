-- ปิดการเรียกฟังก์ชันตรวจสิทธิ์จากภายนอก (ตามคำเตือนของ Supabase advisor)
-- ผู้ใช้ที่ล็อกอินแล้วยังต้องเรียกได้ เพราะ RLS policy ใช้ฟังก์ชันเหล่านี้
revoke execute on function current_role_name() from public, anon;
revoke execute on function current_branch() from public, anon;
grant execute on function current_role_name() to authenticated;
grant execute on function current_branch() to authenticated;

-- write_audit ถูกเรียกผ่าน trigger เท่านั้น ไม่ต้องให้ใครเรียกตรง
revoke execute on function write_audit() from public, anon, authenticated;
