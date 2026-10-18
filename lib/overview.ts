import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysISO, todayTH } from '@/lib/format';
import { dueInfo } from '@/lib/contracts';

type Active = {
  id: string; contract_no: string; principal: number; due_date: string; grace_days: number; status: string;
  customer: { full_name: string } | null; item: { name: string } | null;
};

// ตัวเลขสัญญาที่ใช้ทั้งหน้าผู้บริหารและหน้าหลักพนักงาน
export async function contractOverview(supabase: SupabaseClient) {
  const today = todayTH();
  const monthStart = `${today.slice(0, 8)}01T00:00:00+07:00`;
  const head = { count: 'exact' as const, head: true };
  const [active, redeemed, forfeited, pending, interest] = await Promise.all([
    supabase.from('contracts').select('id, contract_no, principal, due_date, grace_days, status, customer:customers(full_name), item:items(name)')
      .eq('status', 'active').order('due_date').returns<Active[]>(),
    supabase.from('contracts').select('id', head).eq('status', 'redeemed'),
    supabase.from('contracts').select('id', head).eq('status', 'forfeited'),
    supabase.from('contracts').select('id', head).eq('status', 'pending'),
    supabase.from('contract_transactions').select('interest_amount').gte('created_at', monthStart),
  ]);
  const rows = active.data ?? [];
  const soon = addDaysISO(today, 7);
  const overdue = rows.filter((r) => r.due_date < today);
  const dueSoon = rows.filter((r) => r.due_date >= today && r.due_date <= soon);
  return {
    byStatus: {
      active: rows.length - overdue.length - dueSoon.length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      redeemed: redeemed.count ?? 0,
      forfeited: forfeited.count ?? 0,
    },
    outstanding: rows.reduce((s, r) => s + Number(r.principal), 0),
    pending: pending.count ?? 0,
    interestThisMonth: (interest.data ?? []).reduce((s, t) => s + Number(t.interest_amount), 0),
    due: [...overdue, ...dueSoon].slice(0, 6).map((r) => {
      const info = dueInfo(r, today)!;
      return {
        id: r.id, no: r.contract_no, customer: r.customer?.full_name ?? '', item: r.item?.name ?? '',
        due: info.label, amount: Number(r.principal), overdue: info.overdue,
      };
    }),
  };
}
