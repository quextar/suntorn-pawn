import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Boxes, CalendarClock, Coins, FileText, History, PackagePlus,
  Search, Settings2, ShieldAlert, TrendingUp, Users, Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { BorderBeam } from '@/components/ui/border-beam';
import { CashFlowChart, type CashDay } from '@/components/dashboard/cash-flow-chart';
import { Reveal } from '@/components/dashboard/reveal';
import { cn } from '@/lib/utils';

const TZ = 'Asia/Bangkok';

type RecentCustomer = {
  id: string; full_name: string; phone: string | null; is_blacklisted: boolean; created_at: string;
};
type ActivityRow = {
  id: number; table: string; action: string; subject: string | null; actor: string; at: string;
};

export type ExecutiveDashboardProps = {
  ownerName: string;
  branchName: string;
  today: string;
  stats: { customers: number; newThisMonth: number; blacklisted: number };
  contracts: {
    byStatus: { active: number; dueSoon: number; overdue: number; redeemed: number; forfeited: number };
    outstanding: number;
    pending: number;
    interestThisMonth: number;
    due: { id: string; no: string; customer: string; item: string; due: string; amount: number; overdue: boolean }[];
  };
  cashDays: CashDay[];
  cashToday: { cashIn: number; cashOut: number; closed: boolean };
  warehouse: { inStorage: number; forfeited: number; unplaced: number };
  categories: { name: string; principal: number; count: number }[];
  recentCustomers: RecentCustomer[];
  activity: ActivityRow[];
  settings: Record<string, unknown>;
};

const ACTIONS: Record<string, string> = { INSERT: 'เพิ่ม', UPDATE: 'แก้ไข', DELETE: 'ลบ' };
const TABLES: Record<string, string> = {
  customers: 'ลูกค้า', settings: 'ค่าตั้งค่า', profiles: 'ผู้ใช้', contracts: 'สัญญา', items: 'สินค้า',
  locations: 'ตำแหน่ง', item_categories: 'ประเภทสินค้า', cash_closings: 'ปิดยอด',
};

// สีสถานะ ใช้คู่กับชื่อและตัวเลขเสมอ
const STATUS = [
  { key: 'active', label: 'ดำเนินอยู่', color: '#4A8CF0' },
  { key: 'dueSoon', label: 'ครบใน 7 วัน', color: '#E0A100' },
  { key: 'overdue', label: 'เกินกำหนด', color: '#F97316' },
  { key: 'redeemed', label: 'ไถ่ถอนแล้ว', color: '#22A06B' },
  { key: 'forfeited', label: 'หลุดจำนำ', color: '#EE4B6A' },
] as const;

const baht = (n: number) => new Intl.NumberFormat('th-TH').format(n);
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso));

function Panel({
  title, icon: Icon, href, linkLabel = 'ดูทั้งหมด', className, children,
}: {
  title: string; icon: typeof Users; href?: string; linkLabel?: string; className?: string; children: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm', className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-white">
          <Icon className="size-4 text-white/60" /> {title}
        </h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
            {linkLabel} <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, icon: Icon, accent }: { label: string; value: string; hint: string; icon: typeof Users; accent?: boolean }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-4 md:p-5',
      accent ? 'border-white/20 bg-gradient-to-br from-[#1D3A8A]/70 to-[#0B1533]/40' : 'border-white/10 bg-white/[0.04]',
    )}>
      <div className="flex items-center justify-between text-sm text-white/60">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="mt-3 truncate text-2xl font-bold tabular-nums tracking-tight text-white md:text-4xl">{value}</div>
      <div className="mt-1 line-clamp-2 text-xs text-white/50">{hint}</div>
      {accent && <BorderBeam size={140} duration={9} colorFrom="#ffffff" colorTo="#EE4B6A" />}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-white/40">{children}</p>;
}

export function ExecutiveDashboard({
  ownerName, branchName, today, stats, contracts, cashDays, cashToday, warehouse, categories,
  recentCustomers, activity, settings,
}: ExecutiveDashboardProps) {
  const s = contracts.byStatus;
  const running = s.active + s.dueSoon + s.overdue;
  const statusTotal = STATUS.reduce((n, x) => n + s[x.key], 0);
  const follow = s.dueSoon + s.overdue;
  const catMax = Math.max(1, ...categories.map((c) => c.principal));
  const in14 = cashDays.reduce((n, d) => n + d.cashIn, 0);
  const out14 = cashDays.reduce((n, d) => n + d.cashOut, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050A1C] pb-20 text-white">
      {/* แสงไล่สีด้านหลัง สีกรม-แดง-ขาวของร้าน */}
      <div className="pointer-events-none absolute -right-60 -top-10 z-0 flex flex-col items-end blur-xl">
        <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#1D4ED8] to-[#0EA5E9] blur-[6rem]" />
        <div className="h-40 w-[90rem] rounded-full bg-gradient-to-b from-[#7F1D1D] to-[#C8102E] blur-[6rem]" />
        <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#C8102E] to-[#1E3A8A] blur-[6rem]" />
      </div>
      <div className="bg-noise pointer-events-none absolute inset-0 z-0 opacity-30" />

      <div className="relative z-10">
        {/* ส่วนหัว */}
        <section className="mx-auto max-w-6xl px-4 pt-12 text-center md:pt-16">
          <Reveal>
            <Link
              href={contracts.pending ? '/approvals' : '/contracts'}
              className="mx-auto flex max-w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm hover:bg-white/15"
            >
              <CalendarClock className="size-4 text-white/70" />
              {today}<span className="hidden sm:inline"> · {branchName}</span>
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              ภาพรวมร้าน<br className="sm:hidden" />{' '}
              <span className="whitespace-nowrap bg-gradient-to-r from-white via-rose-200 to-[#EE4B6A] bg-clip-text text-transparent">สุนทรการค้า</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 md:text-lg">
              สวัสดีคุณ{ownerName} ตอนนี้มีสัญญาดำเนินอยู่ {baht(running)} สัญญา
              ยอดเงินต้นคงค้าง ฿{baht(contracts.outstanding)}
              {follow > 0 ? ` และมีลูกค้าที่ต้องตาม ${baht(follow)} ราย` : ' ไม่มีลูกค้าที่ต้องตาม'}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/approvals"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-base font-medium text-[#050A1C] hover:bg-white/90"
              >
                <BadgeCheck className="size-5" /> อนุมัติวงเงิน
                {contracts.pending > 0 && (
                  <span className="rounded-full bg-[#C8102E] px-2 text-xs font-bold leading-5 text-white">{contracts.pending}</span>
                )}
              </Link>
              <Link
                href="/pawn/new"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-8 text-base font-medium text-white hover:bg-white/10"
              >
                <PackagePlus className="size-5" /> รับจำนำใหม่
              </Link>
            </div>

            <form action="/contracts" className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] p-1.5 pl-5 backdrop-blur-sm focus-within:border-white/40">
              <input type="hidden" name="f" value="all" />
              <Search className="size-4 shrink-0 text-white/50" />
              <input
                name="q"
                placeholder="ค้นหาเลขสัญญา ชื่อ หรือเบอร์โทรลูกค้า"
                aria-label="ค้นหาสัญญาหรือลูกค้า"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="h-10 shrink-0 rounded-full bg-white/15 px-5 text-sm font-medium text-white hover:bg-white/25">
                ค้นหา
              </button>
            </form>
          </Reveal>
        </section>

        {/* แดชบอร์ด วางแทนรูปภาพหลักของ Hero */}
        <Reveal delay={0.34} className="relative mx-auto mt-16 w-full max-w-6xl px-4 md:mt-20">
          <div className="pointer-events-none absolute inset-x-10 inset-y-0 rounded-3xl bg-[#4A8CF0] opacity-20 blur-[8rem]" />
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0B1533]/80 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span className="size-3 rounded-full bg-[#C8102E]" />
              <span className="size-3 rounded-full bg-white/70" />
              <span className="size-3 rounded-full bg-[#4A8CF0]" />
              <span className="ml-3 truncate text-xs text-white/50">แดชบอร์ดผู้บริหาร · {branchName}</span>
            </div>

            <div className="space-y-4 p-4 md:p-6">
              {/* ตัวเลขหลัก */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <Kpi accent icon={Coins} label="ยอดเงินต้นคงค้าง" value={`฿${baht(contracts.outstanding)}`} hint={`จาก ${baht(running)} สัญญาที่ยังไม่ปิด`} />
                <Kpi icon={TrendingUp} label="ดอกเบี้ยรับเดือนนี้" value={`฿${baht(contracts.interestThisMonth)}`} hint="รวมต่อดอก ลดต้น และไถ่ถอน" />
                <Kpi icon={FileText} label="รออนุมัติวงเงิน" value={baht(contracts.pending)} hint={contracts.pending ? 'กดปุ่มอนุมัติวงเงินด้านบน' : 'ไม่มีรายการค้าง'} />
                <Kpi icon={Users} label="ลูกค้าทั้งหมด" value={baht(stats.customers)} hint={`ใหม่เดือนนี้ ${baht(stats.newThisMonth)} คน`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="เงินเข้าออก 14 วันล่าสุด" icon={Wallet} href="/reports" linkLabel="รายงาน" className="lg:col-span-2">
                  <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-white/60">รับเข้ารวม <b className="tabular-nums text-white">฿{baht(in14)}</b></span>
                    <span className="text-white/60">จ่ายออกรวม <b className="tabular-nums text-white">฿{baht(out14)}</b></span>
                  </div>
                  <CashFlowChart days={cashDays} />
                </Panel>

                <Panel title="สถานะสัญญา" icon={FileText} href="/contracts">
                  <div className="text-3xl font-bold tabular-nums">{baht(statusTotal)} <span className="text-sm font-normal text-white/50">สัญญา</span></div>
                  <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/10">
                    {statusTotal > 0 && STATUS.filter((x) => s[x.key] > 0).map((x) => (
                      <div key={x.key} style={{ width: `${(s[x.key] / statusTotal) * 100}%`, background: x.color }} />
                    ))}
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {STATUS.map((x) => (
                      <li key={x.key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-white/70">
                          <span className="size-2.5 rounded-full" style={{ background: x.color }} /> {x.label}
                        </span>
                        <span className="font-semibold tabular-nums text-white">{baht(s[x.key])}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="ครบกำหนด / เกินกำหนด" icon={AlertTriangle} href="/contracts?f=overdue" className="lg:col-span-2">
                  {!contracts.due.length && <Empty>ไม่มีสัญญาที่ต้องตาม</Empty>}
                  <div className="space-y-2">
                    {contracts.due.map((d) => (
                      <Link key={d.id} href={`/contracts/${d.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.07]">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white">{d.customer}</div>
                          <div className="truncate text-xs text-white/50">{d.no} · {d.item}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold tabular-nums text-white">฿{baht(d.amount)}</div>
                          <div className={cn('text-xs font-medium', d.overdue ? 'text-[#FF8A9B]' : 'text-amber-300')}>{d.due}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Panel>

                <div className="grid gap-4">
                  <Panel title="เงินสดวันนี้" icon={Wallet} href="/cash" linkLabel={cashToday.closed ? 'ปิดยอดแล้ว' : 'ยังไม่ปิดยอด'}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-white/50">รับเข้า</div>
                        <div className="text-xl font-semibold tabular-nums">฿{baht(cashToday.cashIn)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">จ่ายออก</div>
                        <div className="text-xl font-semibold tabular-nums">฿{baht(cashToday.cashOut)}</div>
                      </div>
                    </div>
                  </Panel>
                  <Panel title="คลังสินค้า" icon={Boxes} href="/warehouse">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'ในคลัง', value: warehouse.inStorage },
                        { label: 'รอขาย', value: warehouse.forfeited },
                        { label: 'ยังไม่เข้าช่อง', value: warehouse.unplaced, warn: warehouse.unplaced > 0 },
                      ].map((w) => (
                        <div key={w.label} className={cn('rounded-xl border p-2.5', w.warn ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10')}>
                          <div className="text-xl font-semibold tabular-nums">{baht(w.value)}</div>
                          <div className="text-[11px] text-white/50">{w.label}</div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="เงินต้นตามประเภทสินค้า" icon={Coins}>
                  {!categories.length && <Empty>ยังไม่มีสัญญาที่ดำเนินอยู่</Empty>}
                  <ul className="space-y-3">
                    {categories.map((c) => (
                      <li key={c.name}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="truncate text-white/80">{c.name} <span className="text-white/40">({baht(c.count)})</span></span>
                          <span className="shrink-0 tabular-nums text-white">฿{baht(c.principal)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-[#4A8CF0]" style={{ width: `${(c.principal / catMax) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="ลูกค้ามาล่าสุด" icon={Users} href="/customers">
                  {!recentCustomers.length && <Empty>ยังไม่มีลูกค้าในระบบ</Empty>}
                  <div className="space-y-1">
                    {recentCustomers.map((c) => (
                      <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.06]">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold">
                          {c.full_name.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate text-sm font-medium">
                            {c.full_name}
                            {c.is_blacklisted && (
                              <span className="rounded bg-[#C8102E] px-1.5 text-[10px] font-semibold leading-4">บัญชีดำ</span>
                            )}
                          </div>
                          <div className="text-xs text-white/50">{c.phone ?? 'ไม่มีเบอร์โทร'} · {shortDate(c.created_at)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Panel>

                <Panel title="ความเคลื่อนไหวล่าสุด" icon={History}>
                  {!activity.length && <Empty>ยังไม่มีความเคลื่อนไหว</Empty>}
                  <ol className="relative m-0 list-none space-y-3 border-l border-white/10 pl-4">
                    {activity.map((a) => (
                      <li key={a.id} className="relative">
                        <span className={cn(
                          'absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-[#0B1533]',
                          a.action === 'DELETE' ? 'bg-[#EE4B6A]' : 'bg-[#4A8CF0]',
                        )} />
                        <div className="text-sm text-white/80">
                          <span className="font-medium text-white">{a.actor}</span>{' '}
                          {ACTIONS[a.action] ?? a.action}{TABLES[a.table] ?? a.table}
                          {a.subject && <span className="font-medium text-white"> {a.subject}</span>}
                        </div>
                        <div className="text-xs text-white/40">{shortDate(a.at)}</div>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>

              {/* แถบล่าง ค่าตั้งค่าและบัญชีดำ */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><Settings2 className="size-4" /> ดอกเบี้ย {String(settings.interest_rate_percent_per_month ?? '–')}% ต่อเดือน{settings.interest_calc === 'daily' ? ' (คิดตามวัน)' : ''}</span>
                <span>อายุสัญญา {String(settings.contract_term_months ?? '–')} เดือน</span>
                <span>ผ่อนผัน {String(settings.grace_period_days ?? '–')} วัน</span>
                <span className="flex items-center gap-1.5"><ShieldAlert className="size-4 text-[#FF8A9B]" /> บัญชีดำ {baht(stats.blacklisted)} คน</span>
                <Link href="/settings" className="ml-auto flex items-center gap-1 text-white/70 hover:text-white">ตั้งค่า <ArrowRight className="size-3" /></Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
