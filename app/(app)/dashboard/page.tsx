import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { contractOverview } from '@/lib/overview';
import { addDaysISO, todayTH } from '@/lib/format';
import { ExecutiveDashboard } from '@/components/dashboard/executive-dashboard';

const TZ = 'Asia/Bangkok';

// วันที่ 1 ของเดือนนี้ตามเวลาไทย
function startOfMonthBangkok() {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' })
    .format(new Date()).split('-');
  return `${y}-${m}-01T00:00:00+07:00`;
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== 'ceo') redirect('/');

  const count = { count: 'exact' as const, head: true };
  const todayISO = todayTH();
  const from = addDaysISO(todayISO, -13);
  const [
    branch, total, newThisMonth, blacklisted, recent, activity, settings, contracts,
    txs, closing, inStorage, forfeitedItems, unplaced, activeByCat,
  ] = await Promise.all([
    supabase.from('branches').select('name').eq('id', profile.branch_id).single(),
    supabase.from('customers').select('id', count),
    supabase.from('customers').select('id', count).gte('created_at', startOfMonthBangkok()),
    supabase.from('customers').select('id', count).eq('is_blacklisted', true),
    supabase.from('customers').select('id, full_name, phone, is_blacklisted, created_at')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('audit_log').select('id, table_name, action, new_data, old_data, created_at, actor:profiles(full_name)')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('settings').select('key, value'),
    contractOverview(supabase),
    supabase.from('contract_transactions').select('created_at, cash_in, cash_out').gte('created_at', `${from}T00:00:00+07:00`),
    supabase.from('cash_closings').select('id').eq('close_date', todayISO).maybeSingle(),
    supabase.from('items').select('id', count).eq('status', 'in_storage'),
    supabase.from('items').select('id', count).eq('status', 'forfeited'),
    supabase.from('items').select('id', count).in('status', ['in_storage', 'forfeited']).is('location_id', null),
    supabase.from('contracts').select('principal, item:items(category:item_categories(name))').eq('status', 'active'),
  ]);

  // รวมเงินเข้าออกรายวันตามเวลาไทย
  const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
  const cashDays = Array.from({ length: 14 }, (_, i) => {
    const date = addDaysISO(from, i);
    const label = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short' })
      .format(new Date(`${date}T12:00:00+07:00`));
    return { date, label, cashIn: 0, cashOut: 0 };
  });
  for (const t of txs.data ?? []) {
    const d = cashDays.find((x) => x.date === dayOf(t.created_at));
    if (d) { d.cashIn += Number(t.cash_in); d.cashOut += Number(t.cash_out); }
  }
  const todayCash = cashDays[cashDays.length - 1];

  // เงินต้นของสัญญาที่ยังเปิดอยู่ แยกตามประเภทสินค้า
  const byCat = new Map<string, { name: string; principal: number; count: number }>();
  for (const c of activeByCat.data ?? []) {
    const name = (c.item as unknown as { category: { name: string } | null } | null)?.category?.name ?? 'ไม่ระบุ';
    const row = byCat.get(name) ?? { name, principal: 0, count: 0 };
    row.principal += Number(c.principal);
    row.count += 1;
    byCat.set(name, row);
  }

  const today = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, dateStyle: 'full' }).format(new Date());

  return (
    <ExecutiveDashboard
      ownerName={profile.full_name}
      branchName={branch.data?.name ?? 'สาขาหลัก'}
      today={today}
      stats={{
        customers: total.count ?? 0,
        newThisMonth: newThisMonth.count ?? 0,
        blacklisted: blacklisted.count ?? 0,
      }}
      recentCustomers={recent.data ?? []}
      activity={(activity.data ?? []).map((a) => ({
        id: a.id,
        table: a.table_name,
        action: a.action,
        subject: (({ full_name: n1, contract_no: n2, name: n3, code: n4 }) => n1 ?? n2 ?? n3 ?? n4 ?? null)(
          ((a.new_data ?? a.old_data) ?? {}) as Record<string, string | undefined>,
        ),
        actor: (a.actor as unknown as { full_name: string } | null)?.full_name ?? 'ระบบ',
        at: a.created_at,
      }))}
      contracts={contracts}
      cashDays={cashDays}
      cashToday={{ cashIn: todayCash.cashIn, cashOut: todayCash.cashOut, closed: !!closing.data }}
      warehouse={{ inStorage: inStorage.count ?? 0, forfeited: forfeitedItems.count ?? 0, unplaced: unplaced.count ?? 0 }}
      categories={[...byCat.values()].sort((a, b) => b.principal - a.principal).slice(0, 6)}
      settings={Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value]))}
    />
  );
}
