import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { SiteHeader } from '@/components/site-header';
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
  const [branch, total, newThisMonth, blacklisted, recent, activity, settings] = await Promise.all([
    supabase.from('branches').select('name').eq('id', profile.branch_id).single(),
    supabase.from('customers').select('id', count),
    supabase.from('customers').select('id', count).gte('created_at', startOfMonthBangkok()),
    supabase.from('customers').select('id', count).eq('is_blacklisted', true),
    supabase.from('customers').select('id, full_name, phone, is_blacklisted, created_at')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('audit_log').select('id, table_name, action, new_data, old_data, created_at, actor:profiles(full_name)')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('settings').select('key, value'),
  ]);

  const today = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, dateStyle: 'full' }).format(new Date());

  return (
    <>
      <SiteHeader name={profile.full_name} isCeo />
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
          subject: ((a.new_data ?? a.old_data) as { full_name?: string } | null)?.full_name ?? null,
          actor: (a.actor as unknown as { full_name: string } | null)?.full_name ?? 'ระบบ',
          at: a.created_at,
        }))}
        settings={Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value]))}
      />
    </>
  );
}
