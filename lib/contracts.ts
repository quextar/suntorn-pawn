import { addDaysISO, daysBetween, todayTH } from '@/lib/format';

export type ContractMoney = {
  status: string;
  principal: number | string | null;
  interest_rate: number | string;
  interest_calc: string;
  interest_paid_until: string | null;
  due_date: string | null;
  grace_days: number;
};

// บวกเดือนแบบปฏิทิน วันที่เกินสิ้นเดือนปัดเป็นวันสุดท้าย (31 ม.ค. + 1 เดือน = 28 ก.พ.) เหมือน Postgres
export function addMonthsISO(iso: string, months: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

// สูตรเดียวกับ months_due() ในฐานข้อมูล: จำ 21 ต.ค. ไถ่ถึง 21 พ.ย. = 1 เดือน, 22 พ.ย. = 2 เดือน
export function monthsDue(from: string, on: string) {
  if (on < from) return 0;
  const [fy, fm] = from.split('-').map(Number);
  const [oy, om] = on.split('-').map(Number);
  const m = (oy - fy) * 12 + om - fm;
  return Math.max(1, m + (addMonthsISO(from, m) < on ? 1 : 0));
}

// สูตรเดียวกับ interest_due() ในฐานข้อมูล ใช้แสดงผล
export function interestDue(c: ContractMoney, on = todayTH()) {
  if (c.status !== 'active' || !c.principal || !c.interest_paid_until) return { days: 0, months: 0, amount: 0 };
  const days = Math.max(daysBetween(c.interest_paid_until, on), 0);
  const p = Number(c.principal);
  const r = Number(c.interest_rate) / 100;
  if (c.interest_calc === 'monthly') {
    const months = monthsDue(c.interest_paid_until, on);
    return { days, months, amount: Math.round(p * r * months) };
  }
  return { days, months: 0, amount: days <= 0 ? 0 : Math.round((p * r * days) / 30) };
}

// วันครบกำหนดใหม่หลังต่อดอกวันนี้ ตรงกับ renew_contract()
export function dueAfterRenew(c: ContractMoney & { term_months: number }, on = todayTH()) {
  const paid = c.interest_calc === 'monthly' && c.interest_paid_until
    ? addMonthsISO(c.interest_paid_until, monthsDue(c.interest_paid_until, on))
    : on;
  return addMonthsISO(paid, c.term_months);
}

export function dueInfo(c: Pick<ContractMoney, 'status' | 'due_date' | 'grace_days'>, on = todayTH()) {
  if (c.status !== 'active' || !c.due_date) return null;
  const left = daysBetween(on, c.due_date);
  const graceEnd = addDaysISO(c.due_date, c.grace_days);
  const pastGrace = on > graceEnd;
  return {
    left,
    overdue: left < 0,
    pastGrace,
    graceEnd,
    label: left > 0 ? `อีก ${left} วัน` : left === 0 ? 'ครบกำหนดวันนี้' : pastGrace ? `เกินผ่อนผัน ${-left} วัน` : `เกินกำหนด ${-left} วัน`,
  };
}
