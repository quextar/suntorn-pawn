import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowRight, CalendarClock, FileText, Search, Settings2,
  ShieldAlert, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const TZ = 'Asia/Bangkok';
const NAVY = '#0E2361';
const RED = '#C8102E';

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
  recentCustomers: RecentCustomer[];
  activity: ActivityRow[];
  settings: Record<string, unknown>;
};

// ตัวเลขสัญญาเป็นข้อมูลตัวอย่าง จนกว่าระบบสัญญา (สัปดาห์ที่ 2) จะพร้อม
const SAMPLE_CONTRACTS = [
  { label: 'ดำเนินอยู่', value: 128, color: NAVY },
  { label: 'ใกล้ครบกำหนด', value: 17, color: '#E0A100' },
  { label: 'ไถ่ถอนแล้ว', value: 342, color: '#2F855A' },
  { label: 'หลุดจำนำ', value: 21, color: RED },
];
const SAMPLE_DUE = [
  { no: 'PN-0412', customer: 'สมชาย ใจดี', item: 'iPhone 15 Pro', due: 'พรุ่งนี้', amount: 18000 },
  { no: 'PN-0398', customer: 'วรรณา ศรีสุข', item: 'นาฬิกา Seiko', due: 'อีก 3 วัน', amount: 4500 },
  { no: 'PN-0377', customer: 'ประเสริฐ ทองมา', item: 'MacBook Air M2', due: 'อีก 6 วัน', amount: 22000 },
];

const ACTIONS: Record<string, string> = { INSERT: 'เพิ่ม', UPDATE: 'แก้ไข', DELETE: 'ลบ' };
const TABLES: Record<string, string> = { customers: 'ลูกค้า', settings: 'ค่าตั้งค่า', profiles: 'ผู้ใช้' };

const baht = (n: number) => new Intl.NumberFormat('th-TH').format(n);
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso));

function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      <Sparkles className="size-3" /> ข้อมูลตัวอย่าง
    </span>
  );
}

function StatCard({
  icon: Icon, label, value, hint, tone = 'navy', beam = false,
}: {
  icon: typeof Users; label: string; value: string; hint: string; tone?: 'navy' | 'red'; beam?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="font-medium">{label}</CardDescription>
        <span className={cn(
          'flex size-9 items-center justify-center rounded-md',
          tone === 'red' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
        )}>
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold tabular-nums', tone === 'red' && 'text-destructive')}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
      {beam && <BorderBeam size={120} duration={10} colorFrom={NAVY} colorTo={RED} />}
    </Card>
  );
}

export function ExecutiveDashboard({
  ownerName, branchName, today, stats, recentCustomers, activity, settings,
}: ExecutiveDashboardProps) {
  const contractTotal = SAMPLE_CONTRACTS.reduce((s, c) => s + c.value, 0);

  return (
    <main className="relative overflow-hidden pb-16">
      {/* พื้นหลังส่วนหัว */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-40 [background-image:radial-gradient(hsl(225_75%_22%/0.15)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <section className="mx-auto max-w-6xl px-4 pt-10 text-center md:pt-14">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <CalendarClock className="size-3.5 text-primary" /> {today} · {branchName}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-primary md:text-5xl">
          ภาพรวมร้าน<span className="text-destructive">สุนทรการค้า</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground md:text-lg">
          สวัสดีคุณ{ownerName} ดูลูกค้า สัญญา และความเคลื่อนไหวของร้านได้ในหน้าเดียว
        </p>

        <form action="/customers" className="mx-auto mt-7 flex max-w-xl flex-col gap-2 text-left sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="q">ค้นหาลูกค้า</Label>
            <Input id="q" name="q" placeholder="ชื่อหรือเบอร์โทร" className="h-11 bg-card" />
          </div>
          <Button type="submit" size="lg" className="gap-2">
            <Search className="size-4" /> ค้นหา
          </Button>
        </form>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <Tabs defaultValue="overview" className="w-full">
          <div className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0">
            <TabsList className="h-auto bg-card p-1 shadow-sm">
              <TabsTrigger value="overview" className="gap-1.5 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Activity className="size-4" /> ภาพรวม
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-1.5 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="size-4" /> ลูกค้า
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="size-4" /> ความเคลื่อนไหว
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings2 className="size-4" /> ตั้งค่าสัญญา
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="relative mt-6 rounded-xl border bg-card/60 p-3 shadow-lg backdrop-blur md:p-6">
            <BorderBeam size={260} duration={14} colorFrom={NAVY} colorTo={RED} borderWidth={2} />

            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="ลูกค้าทั้งหมด" value={baht(stats.customers)} hint="ข้อมูลจริงจากระบบ" beam />
                <StatCard icon={UserPlus} label="ลูกค้าใหม่เดือนนี้" value={baht(stats.newThisMonth)} hint="นับตั้งแต่วันที่ 1" />
                <StatCard icon={ShieldAlert} label="บัญชีดำ" value={baht(stats.blacklisted)} hint="ระบบเตือนเมื่อลูกค้ามาใหม่" tone="red" />
                <StatCard icon={FileText} label="สัญญาค้าง" value="–" hint="เปิดใช้เมื่อระบบสัญญาพร้อม" />
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">สถานะสัญญา</CardTitle>
                      <SampleBadge />
                    </div>
                    <CardDescription>ทั้งหมด {baht(contractTotal)} สัญญา</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                      {SAMPLE_CONTRACTS.map((c) => (
                        <div key={c.label} style={{ width: `${(c.value / contractTotal) * 100}%`, background: c.color }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {SAMPLE_CONTRACTS.map((c) => (
                        <div key={c.label} className="rounded-lg border p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.label}
                          </div>
                          <div className="mt-1 text-xl font-semibold tabular-nums">{baht(c.value)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="size-4 text-destructive" /> ครบกำหนดใน 7 วัน
                      </CardTitle>
                      <SampleBadge />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {SAMPLE_DUE.map((d) => (
                      <div key={d.no} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{d.customer}</div>
                          <div className="truncate text-xs text-muted-foreground">{d.item} · {d.no}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold tabular-nums">฿{baht(d.amount)}</div>
                          <div className="text-xs text-destructive">{d.due}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="mt-0">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">ลูกค้ามาล่าสุด</CardTitle>
                    <CardDescription>6 รายการล่าสุด</CardDescription>
                  </div>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href="/customers/new"><UserPlus className="size-4" /> เพิ่มลูกค้า</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentCustomers.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีลูกค้าในระบบ</p>
                  )}
                  {recentCustomers.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {c.full_name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate font-medium">
                            {c.full_name}
                            {c.is_blacklisted && (
                              <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">บัญชีดำ</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.phone ?? 'ไม่มีเบอร์โทร'}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {shortDate(c.created_at)} <ArrowRight className="size-4" />
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" className="mt-2 w-full">
                    <Link href="/customers">ดูลูกค้าทั้งหมด</Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ความเคลื่อนไหวล่าสุด</CardTitle>
                  <CardDescription>ใครทำอะไรในระบบ บันทึกอัตโนมัติ แก้ไขไม่ได้</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีความเคลื่อนไหว</p>
                  )}
                  <ol className="relative space-y-4 border-l pl-5">
                    {activity.map((a) => (
                      <li key={a.id} className="relative">
                        <span className={cn(
                          'absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-card',
                          a.action === 'DELETE' ? 'bg-destructive' : 'bg-primary',
                        )} />
                        <div className="text-sm">
                          <span className="font-medium">{a.actor}</span>{' '}
                          {ACTIONS[a.action] ?? a.action}{TABLES[a.table] ?? a.table}
                          {a.subject && <span className="font-medium"> {a.subject}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{shortDate(a.at)}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ค่าตั้งค่าสัญญา</CardTitle>
                  <CardDescription>ค่าชั่วคราว ผู้บริหารปรับได้ภายหลัง</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'อายุสัญญา', value: `${settings.contract_term_months ?? '–'} เดือน` },
                    { label: 'ผ่อนผันหลังครบกำหนด', value: `${settings.grace_period_days ?? '–'} วัน` },
                    {
                      label: 'ดอกเบี้ย',
                      value: `${settings.interest_rate_percent_per_month ?? '–'}% ต่อเดือน`,
                      hint: settings.interest_calc === 'daily' ? 'คิดตามจำนวนวัน' : undefined,
                    },
                    { label: 'กระดาษตั๋ว', value: String(settings.ticket_paper ?? '–') },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-4">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="mt-1 text-xl font-semibold">{s.value}</div>
                      {s.hint && <div className="text-xs text-muted-foreground">{s.hint}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </main>
  );
}
