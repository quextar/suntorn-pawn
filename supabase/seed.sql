-- ข้อมูลเริ่มต้น: สาขา ค่าตั้งค่า และบัญชีผู้ใช้
-- ก่อนรัน: สร้างผู้ใช้ 3 คนใน Authentication > Users > Add user ก่อน
-- แล้วแก้อีเมลและชื่อด้านล่างให้ตรงกับที่สร้าง

do $$
declare
  b uuid;
begin
  insert into branches (name) values ('สุนทรการค้า สาขาหลัก') returning id into b;

  -- ค่าชั่วคราว ปรับภายหลังได้ (CEO เท่านั้น)
  insert into settings (branch_id, key, value) values
    (b, 'contract_term_months', '4'),
    (b, 'grace_period_days', '30'),
    (b, 'interest_rate_percent_per_month', '2'),
    (b, 'interest_calc', '"daily"'),
    (b, 'ticket_paper', '"A4"');

  insert into profiles (id, branch_id, full_name, role)
  select u.id, b, x.full_name, x.role::user_role
  from (values
    ('ceo@example.com',    'ชื่อ CEO',        'ceo'),
    ('staff1@example.com', 'ชื่อพนักงานคนที่ 1', 'staff'),
    ('staff2@example.com', 'ชื่อพนักงานคนที่ 2', 'staff')
  ) as x(email, full_name, role)
  join auth.users u on lower(u.email) = lower(x.email);

  if (select count(*) from profiles where branch_id = b) < 3 then
    raise exception 'หาอีเมลผู้ใช้ไม่ครบ 3 คน ตรวจว่าสร้างผู้ใช้ใน Authentication แล้ว และอีเมลตรงกัน';
  end if;
end $$;
