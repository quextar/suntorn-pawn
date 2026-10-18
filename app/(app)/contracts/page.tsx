import Link from 'next/link';
import { ChevronRight, PackagePlus, Search } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { addDaysISO, baht, thDate, todayTH } from '@/lib/format';
import { dueInfo } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';

const FILTERS = [
  { key: 'active', label: 'ดำเนินอยู่' },
  { key: 'due', label: 'ครบกำหนด 7 วัน' },
  { key: 'overdue', label: 'เกินกำหนด' },
  { key: 'pending', label: 'รออนุมัติ' },
  { key: 'redeemed', label: 'ไถ่ถอนแล้ว' },
  { key: 'forfeited', label: 'หลุดจำนำ' },
  { key: 'all', label: 'ทั้งหมด' },
];

type Row = {
  id: string; contract_no: string; status: string; principal: number | null; requested_amount: number;
  due_date: string | null; grace_days: number; created_at: string;
  customer: { full_name: string; phone: string | null } | null; item: { name: string } | null;
};

export default async function Contracts({ searchParams }: { searchParams: { f?: string; q?: string } }) {
  const { supabase } = await requireProfile();
  const f = searchParams.f ?? 'active';
  const q = searchParams.q?.trim().replace(/[,%()*]/g, '');
  const today = todayTH();

  let query = supabase.from('contracts')
    .select(`id, contract_no, status, principal, requested_amount, due_date, grace_days, created_at,
             customer:customers!inner(full_name, phone), item:items(name)`)
    .limit(200);
  if (f === 'due') query = query.eq('status', 'active').gte('due_date', today).lte('due_date', addDaysISO(today, 7)).order('due_date');
  else if (f === 'overdue') query = query.eq('status', 'active').lt('due_date', today).order('due_date');
  else if (f !== 'all') query = query.eq('status', f).order(f === 'active' ? 'due_date' : 'created_at', { ascending: f === 'active' });
  else query = query.order('created_at', { ascending: false });
  if (q) {
    query = /^(pn-?)?\d+$/i.test(q)
      ? query.ilike('contract_no', `%${q.replace(/^pn-?/i, '')}%`)
      : query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`, { referencedTable: 'customers' });
  }
  const { data } = await query.returns<Row[]>();

  return (
    <Page>
      <PageHeader
        title="สัญญา"
        description="ค้นหาด้วยเลขสัญญา ชื่อ หรือเบอร์โทรลูกค้า แล้วเปิดเพื่อต่อดอก ไถ่ถอน หรือพิมพ์ตั๋ว"
        actions={<Button asChild className="gap-1.5"><Link href="/pawn/new"><PackagePlus className="size-4" /> รับจำนำใหม่</Link></Button>}
      />
      <form className="flex gap-2">
        <input type="hidden" name="f" value={f} />
        <Input name="q" defaultValue={q} placeholder="เลขสัญญา ชื่อ หรือเบอร์โทร" className="h-11 bg-card" />
        <Button type="submit" size="lg" className="gap-1.5"><Search className="size-4" /> ค้นหา</Button>
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/contracts?f=${x.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={cn(
              'shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm',
              f === x.key && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {!data?.length ? <Empty>ไม่มีสัญญาในกลุ่มนี้</Empty> : (
        <Card>
          <CardContent className="divide-y p-0">
            {data.map((c) => {
              const due = dueInfo(c, today);
              return (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.contract_no}</span>
                      <StatusBadge status={c.status} overdue={due?.overdue} />
                    </div>
                    <div className="truncate text-sm">{c.item?.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.customer?.full_name} · {c.customer?.phone ?? '–'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">฿{baht(c.principal ?? c.requested_amount)}</div>
                    <div className={cn('text-xs', due?.overdue ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                      {due ? `${thDate(c.due_date)} · ${due.label}` : thDate(c.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
