import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, Clock, FileSearch, PackageOpen, PackagePlus, ScanLine, Search, Wallet } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { baht, thDateLong, thDateTime, todayTH } from '@/lib/format';
import { contractOverview } from '@/lib/overview';
import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/ui/border-beam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Empty } from '@/components/page-header';

const ACTIONS = [
  { href: '/pawn/new', label: 'รับจำนำใหม่', hint: 'บันทึกสินค้า ถ่ายรูป เสนอราคา', icon: PackagePlus, primary: true },
  { href: '/contracts', label: 'ต่อดอก / ไถ่ถอน', hint: 'ค้นหาสัญญาของลูกค้า', icon: FileSearch },
  { href: '/scan', label: 'สแกน QR', hint: 'สติกเกอร์สินค้า หรือช่องเก็บ', icon: ScanLine },
  { href: '/cash', label: 'ปิดยอดวันนี้', hint: 'นับเงินสดปลายวัน', icon: Wallet },
];

export default async function StaffHome() {
  const { supabase, profile } = await requireProfile();
  if (profile.role === 'ceo') redirect('/dashboard');
  const today = todayTH();

  const [overview, { data: pending }, { count: unplaced }, { data: txs }, { data: closing }] = await Promise.all([
    contractOverview(supabase),
    supabase.from('contracts').select('id, contract_no, requested_amount, created_at, item:items(name), customer:customers(full_name)')
      .eq('status', 'pending').order('created_at'),
    supabase.from('items').select('id', { count: 'exact', head: true }).in('status', ['in_storage', 'forfeited']).is('location_id', null),
    supabase.from('contract_transactions').select('cash_in, cash_out').gte('created_at', `${today}T00:00:00+07:00`),
    supabase.from('cash_closings').select('id').eq('close_date', today).maybeSingle(),
  ]);
  const cashIn = (txs ?? []).reduce((s, t) => s + Number(t.cash_in), 0);
  const cashOut = (txs ?? []).reduce((s, t) => s + Number(t.cash_out), 0);

  return (
    <main className="relative pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/10 to-transparent" />
      <section className="mx-auto max-w-6xl px-4 pt-8 md:pt-12">
        <p className="text-sm text-muted-foreground">{thDateLong(today)}</p>
        <h1 className="m-0 mt-1 text-3xl font-bold text-primary md:text-4xl">สวัสดีคุณ{profile.full_name}</h1>
        <form action="/contracts" className="mt-5 flex max-w-xl gap-2">
          <input type="hidden" name="f" value="all" />
          <Input name="q" placeholder="ค้นหาเลขสัญญา ชื่อ หรือเบอร์โทรลูกค้า" className="h-12 bg-card text-base" />
          <Button type="submit" size="lg" className="h-12 gap-1.5"><Search className="size-4" /> ค้นหา</Button>
        </form>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 px-4 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.href} href={a.href}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5',
              a.primary ? 'bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            <a.icon className={cn('size-7', a.primary ? 'text-white' : 'text-primary')} />
            <div className="mt-3 text-lg font-semibold">{a.label}</div>
            <div className={cn('text-xs', a.primary ? 'text-white/75' : 'text-muted-foreground')}>{a.hint}</div>
            {a.primary && <BorderBeam size={90} duration={8} colorFrom="#ffffff" colorTo="#C8102E" />}
          </Link>
        ))}
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="size-4 text-destructive" /> ครบกำหนด / เกินกำหนด</CardTitle>
            <Link href="/contracts?f=overdue" className="text-sm text-primary hover:underline">ดูทั้งหมด</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!overview.due.length && <Empty>ไม่มีสัญญาที่ต้องตาม</Empty>}
            {overview.due.map((d) => (
              <Link key={d.id} href={`/contracts/${d.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.customer}</div>
                  <div className="truncate text-xs text-muted-foreground">{d.no} · {d.item}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold tabular-nums">฿{baht(d.amount)}</div>
                  <div className={cn('text-xs', d.overdue ? 'font-semibold text-destructive' : 'text-amber-700')}>{d.due}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="size-4 text-amber-600" /> รอผู้บริหารอนุมัติ ({pending?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!pending?.length && <p className="text-sm text-muted-foreground">ไม่มีรายการค้าง</p>}
              {pending?.map((p) => (
                <Link key={p.id} href={`/contracts/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm hover:bg-accent">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{(p.item as unknown as { name: string } | null)?.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{(p.customer as unknown as { full_name: string } | null)?.full_name} · {thDateTime(p.created_at)}</div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {!!unplaced && (
            <Link href="/warehouse" className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <PackageOpen className="size-6" />
              <div className="flex-1"><b>{unplaced} ชิ้น</b> ยังไม่ได้เก็บเข้าช่อง</div>
              <ArrowRight className="size-4" />
            </Link>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Wallet className="size-4" /> เงินสดวันนี้</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span>รับเข้า</span><b className="text-emerald-700">฿{baht(cashIn)}</b></div>
              <div className="flex justify-between"><span>จ่ายออก</span><b className="text-destructive">฿{baht(cashOut)}</b></div>
              <Button asChild variant={closing ? 'outline' : 'default'} className="mt-3 w-full">
                <Link href="/cash">{closing ? 'ปิดยอดแล้ว ดูรายละเอียด' : 'ไปปิดยอด'}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
