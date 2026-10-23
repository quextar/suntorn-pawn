-- สุนทรการค้า: ดอกเบี้ยรายเดือนแบบนับตามวันที่ และค่าดำเนินการ
-- รันต่อจาก 0005 ได้เลย รันซ้ำได้
--
-- ดอกเบี้ยแบบ "คิดเป็นเดือน" (monthly) นับตามวันที่ในปฏิทิน:
--   จำวันที่ 21 ต.ค. มาไถ่ตั้งแต่วันนั้นถึง 21 พ.ย. = 1 เดือน, 22 พ.ย. ถึง 21 ธ.ค. = 2 เดือน
--   มาไถ่ก่อนครบกำหนดก็คิดเต็ม 1 เดือน
-- ต่อดอกแบบรายเดือน: จ่ายเป็นเดือน แล้วนับครบกำหนดใหม่ต่อจากเดือนที่จ่ายแล้ว
-- ค่าดำเนินการ: ร้านเก็บเพิ่มตามจำนวนที่กรอก ไม่ลดเงินต้น ไม่เปลี่ยนวันครบกำหนด

-- จำนวนเดือนที่ต้องจ่าย นับจากวันที่จ่ายดอกถึงแล้ว (0 ถ้าจ่ายล่วงหน้าไว้แล้ว)
create or replace function months_due(p_from date, p_on date) returns int
language sql immutable as $$
  select case when p_on < p_from then 0 else greatest(1, m + case when (p_from + make_interval(months => m))::date < p_on then 1 else 0 end) end
  from (select ((extract(year from p_on) - extract(year from p_from)) * 12
               + extract(month from p_on) - extract(month from p_from))::int as m) x
$$;

create or replace function interest_due(c contracts, on_date date default today_th())
returns table (days int, amount numeric)
language sql stable as $$
  select d, case
    when c.status <> 'active' or c.principal is null then 0
    when c.interest_calc = 'monthly' then round(c.principal * c.interest_rate / 100 * months_due(c.interest_paid_until, on_date))
    when d <= 0 then 0
    else round(c.principal * c.interest_rate / 100 * d / 30)
  end
  from (select greatest(on_date - c.interest_paid_until, 0) as d) x
$$;

-- วันที่จ่ายดอกถึง หลังเก็บดอกวันนี้: รายเดือนเลื่อนไปตามจำนวนเดือนที่จ่าย, รายวันเป็นวันนี้
create or replace function _paid_until_after(c contracts, d date) returns date
language sql stable as $$
  select case when c.interest_calc = 'monthly'
    then (c.interest_paid_until + make_interval(months => months_due(c.interest_paid_until, d)))::date
    else d end
$$;

-- ต่อดอก: รายเดือนนับครบกำหนดต่อจากเดือนที่จ่ายแล้ว รายวันนับจากวันนี้เหมือนเดิม
create or replace function renew_contract(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
  i record;
  d date := today_th();
  paid date;
  new_due date;
begin
  select * into i from interest_due(c, d);
  paid := _paid_until_after(c, d);
  new_due := (paid + make_interval(months => c.term_months))::date;
  update contracts set interest_paid_until = paid, due_date = new_due where id = c.id;
  insert into contract_transactions (branch_id, contract_id, kind, interest_amount, interest_days, cash_in, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'interest', i.amount, i.days, i.amount, c.principal, new_due, 'ต่อดอก', me.id);
end $$;

-- เพิ่มต้น (CEO): เก็บดอกที่ค้างก่อน แล้วจ่ายเงินเพิ่ม
create or replace function add_principal(p_id uuid, p_amount numeric) returns void
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
  update contracts set principal = principal + p_amount, interest_paid_until = _paid_until_after(c, d) where id = c.id;
  insert into contract_transactions (branch_id, contract_id, kind, principal_amount, interest_amount, interest_days, cash_in, cash_out, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'add', p_amount, i.amount, i.days, i.amount, p_amount, c.principal + p_amount, c.due_date, 'เพิ่มต้น', me.id);
end $$;

-- ===== ค่าดำเนินการ =====
alter table contract_transactions drop constraint if exists contract_transactions_kind_check;
alter table contract_transactions add constraint contract_transactions_kind_check
  check (kind in ('loan', 'interest', 'reduce', 'add', 'redeem', 'forfeit', 'cancel', 'fee'));

create or replace function add_fee(p_id uuid, p_amount numeric, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _me();
  c contracts := _contract_for_update(p_id, 'active');
begin
  if p_amount is null or p_amount <= 0 then raise exception 'กรุณากรอกค่าดำเนินการ'; end if;
  insert into contract_transactions (branch_id, contract_id, kind, cash_in, principal_after, due_date_after, note, created_by)
  values (c.branch_id, c.id, 'fee', p_amount, c.principal, c.due_date, coalesce(nullif(trim(p_note), ''), 'ค่าดำเนินการ'), me.id);
end $$;

revoke execute on function months_due(date, date), _paid_until_after(contracts, date), add_fee(uuid, numeric, text) from public, anon;
revoke execute on function _paid_until_after(contracts, date) from authenticated;
grant execute on function months_due(date, date), add_fee(uuid, numeric, text) to authenticated;

-- ===== ค่าตั้งค่าของร้าน: ดอก 10% ต่อเดือน คิดเป็นเดือน อายุสัญญา 1 เดือน =====
-- ใช้กับสัญญาที่ทำใหม่หลังจากนี้ (แก้ภายหลังได้ที่หน้า ตั้งค่า)
update settings set value = to_jsonb(10), updated_at = now() where key = 'interest_rate_percent_per_month';
update settings set value = to_jsonb('monthly'::text), updated_at = now() where key = 'interest_calc';
update settings set value = to_jsonb(1), updated_at = now() where key = 'contract_term_months';
