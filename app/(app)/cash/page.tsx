import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { back, num, str } from '@/lib/actions';
import { baht, thDateLong, thDateTime, todayTH, TX_KIND } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';

async function closeCash(f: FormData) {
  'use server';
  const { supabase } = await requireProfile();
  const date = str(f, 'date');
  const { error } = await supabase.rpc('close_cash', {
    p_date: date, p_opening: num(f, 'opening'), p_counted: num(f, 'counted'), p_note: str(f, 'note'),
  });
  if (error) back(`/cash?date=${date}`, 'error', error.message);
  back(`/cash?date=${date}`, 'ok', 'ปิดยอดแล้ว');
}

export default async function Cash({ searchParams }: { searchParams: { date?: string; error?: string; ok?: string } }) {
  const { supabase, profile } = await requireProfile();
  const today = todayTH();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? '') ? searchParams.date! : today;
  const start = `${date}T00:00:00+07:00`;
  const end = `${date}T23:59:59.999+07:00`;

  const [{ data: txs }, { data: closing }, { data: history }, { data: prev }] = await Promise.all([
    supabase.from('contract_transactions')
      .select('id, kind, cash_in, cash_out, created_at, contract:contracts(id, contract_no), by:profiles(full_name)')
      .gte('created_at', start).lte('created_at', end).order('created_at'),
    supabase.from('cash_closings').select('*, by:profiles(full_name)').eq('close_date', date).maybeSingle(),
    supabase.from('cash_closings').select('close_date, expected_cash, counted_cash, difference').order('close_date', { ascending: false }).limit(14),
    supabase.from('cash_closings').select('counted_cash').lt('close_date', date).order('close_date', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const cashIn = (txs ?? []).reduce((s, t) => s + Number(t.cash_in), 0);
  const cashOut = (txs ?? []).reduce((s, t) => s + Number(t.cash_out), 0);
  const opening = Number(closing?.opening_cash ?? prev?.counted_cash ?? 0);
  const canEdit = !closing || profile.role === 'ceo';

  return (
    <Page>
      <PageHeader
        title="ปิดยอดเงินสด"
        description={thDateLong(date)}
        actions={
          <form className="flex gap-2">
            <Input type="date" name="date" defaultValue={date} max={today} className="w-44 bg-card" />
            <SubmitButton variant="outline">ดู</SubmitButton>
          </form>
        }
      />
      <Flash searchParams={searchParams} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['เงินสดต้นวัน', opening, ''],
          ['รับเข้า (ดอก/ไถ่ถอน/ค่าดำเนินการ)', cashIn, 'text-emerald-700'],
          ['จ่ายออก (เงินกู้/เพิ่มต้น)', cashOut, 'text-destructive'],
          ['ควรมีในลิ้นชัก', opening + cashIn - cashOut, 'text-primary'],
        ].map(([k, v, cls]) => (
          <Card key={k as string}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className={cn('text-2xl font-bold tabular-nums', cls as string)}>฿{baht(v as number)}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">รายการวันนี้ ({txs?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {!txs?.length ? <div className="p-4"><Empty>ไม่มีรายการเงินในวันนี้</Empty></div> : (
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr><th className="p-3">เวลา</th><th className="p-3">สัญญา</th><th className="p-3">รายการ</th><th className="p-3 text-right">รับ</th><th className="p-3 text-right">จ่าย</th></tr>
                </thead>
                <tbody className="divide-y">
                  {txs.map((t) => {
                    const c = t.contract as unknown as { id: string; contract_no: string };
                    return (
                      <tr key={t.id}>
                        <td className="p-3">{thDateTime(t.created_at)}</td>
                        <td className="p-3"><Link href={`/contracts/${c.id}`} className="text-primary hover:underline">{c.contract_no}</Link></td>
                        <td className="p-3">{TX_KIND[t.kind]} <span className="text-xs text-muted-foreground">· {(t.by as unknown as { full_name: string } | null)?.full_name}</span></td>
                        <td className="p-3 text-right tabular-nums">{Number(t.cash_in) ? baht(t.cash_in) : ''}</td>
                        <td className="p-3 text-right tabular-nums">{Number(t.cash_out) ? baht(t.cash_out) : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{closing ? 'ปิดยอดแล้ว' : 'นับเงินและปิดยอด'}</CardTitle>
            {closing && (
              <CardDescription>
                โดย {(closing.by as unknown as { full_name: string } | null)?.full_name} · นับได้ ฿{baht(closing.counted_cash)} ·{' '}
                <span className={Number(closing.difference) === 0 ? 'text-emerald-700' : 'font-semibold text-destructive'}>
                  {Number(closing.difference) === 0 ? 'ตรงยอด' : `${Number(closing.difference) > 0 ? 'เกิน' : 'ขาด'} ฿${baht(Math.abs(Number(closing.difference)))}`}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          {canEdit && (
            <CardContent>
              <form action={closeCash} className="grid gap-3">
                <input type="hidden" name="date" value={date} />
                <div className="grid gap-1.5"><Label>เงินสดต้นวัน</Label><Input name="opening" inputMode="decimal" defaultValue={opening} className="h-11" /></div>
                <div className="grid gap-1.5"><Label>เงินสดที่นับได้จริง</Label><Input name="counted" required inputMode="decimal" defaultValue={closing?.counted_cash ?? ''} className="h-11 text-lg" /></div>
                <div className="grid gap-1.5"><Label>หมายเหตุ</Label><Textarea name="note" rows={2} defaultValue={closing?.note ?? ''} /></div>
                <SubmitButton size="lg" confirm="ยืนยันปิดยอดวันนี้?">{closing ? 'แก้ไขยอด (ผู้บริหาร)' : 'ปิดยอด'}</SubmitButton>
              </form>
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">ย้อนหลัง 14 วัน</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!history?.length && <Empty>ยังไม่เคยปิดยอด</Empty>}
          {history?.map((h) => (
            <Link key={h.close_date} href={`/cash?date=${h.close_date}`} className="flex justify-between rounded-md p-2 hover:bg-accent">
              <span>{thDateLong(h.close_date)}</span>
              <span className={Number(h.difference) === 0 ? 'text-emerald-700' : 'font-semibold text-destructive'}>
                {Number(h.difference) === 0 ? 'ตรงยอด' : `ต่าง ฿${baht(h.difference)}`}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </Page>
  );
}
