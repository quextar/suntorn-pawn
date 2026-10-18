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

// สูตรเดียวกับ interest_due() ในฐานข้อมูล ใช้แสดงผลในรายการ
export function interestDue(c: ContractMoney, on = todayTH()) {
  if (c.status !== 'active' || !c.principal || !c.interest_paid_until) return { days: 0, amount: 0 };
  const days = Math.max(daysBetween(c.interest_paid_until, on), 0);
  const p = Number(c.principal);
  const r = Number(c.interest_rate) / 100;
  const amount = days <= 0 ? 0
    : c.interest_calc === 'monthly' ? Math.round(p * r * Math.ceil(days / 30))
    : Math.round((p * r * days) / 30);
  return { days, amount };
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
