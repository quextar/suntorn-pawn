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
