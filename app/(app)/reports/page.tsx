import { Download } from 'lucide-react';
import { requireCeo } from '@/lib/auth';
import { addDaysISO, baht, todayTH } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Page, PageHeader } from '@/components/page-header';

const EXPORTS = [
  { type: 'contracts', title: 'สัญญา', desc: 'ทุกสัญญาที่สร้างในช่วงวันที่ พร้อมลูกค้า สินค้า และสถานะ' },
  { type: 'transactions', title: 'รายการเงิน', desc: 'จ่ายเงินกู้ ต่อดอก ค่าดำเนินการ ไถ่ถอน ในช่วงวันที่' },
  { type: 'customers', title: 'ลูกค้า', desc: 'ลูกค้าที่เพิ่มในช่วงวันที่ รวมบัญชีดำ' },
  { type: 'stock', title: 'สต๊อกในคลังตอนนี้', desc: 'ของที่อยู่ในคลังและของหลุดจำนำ พร้อมตำแหน่ง (ไม่ใช้ช่วงวันที่)' },
];

export default async function Reports(props: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireCeo();
  const today = todayTH();
  const from = searchParams.from ?? `${today.slice(0, 8)}01`;
  const to = searchParams.to ?? today;
  const { data: txs } = await supabase.from('contract_transactions')
    .select('kind, interest_amount, cash_in, cash_out')
    .gte('created_at', `${from}T00:00:00+07:00`).lte('created_at', `${to}T23:59:59.999+07:00`);
  const sum = (k: 'interest_amount' | 'cash_in' | 'cash_out', kind?: string) =>
    (txs ?? []).filter((t) => !kind || t.kind === kind).reduce((s, t) => s + Number(t[k]), 0);
  const qs = `from=${from}&to=${to}`;

  return (
    <Page>
      <PageHeader title="รายงาน" description="สรุปตัวเลขตามช่วงวันที่ และส่งออกเป็นไฟล์ Excel" />
      <form className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5"><Label>ตั้งแต่</Label><Input type="date" name="from" defaultValue={from} className="bg-card" /></div>
        <div className="grid gap-1.5"><Label>ถึง</Label><Input type="date" name="to" defaultValue={to} max={today} className="bg-card" /></div>
        <Button type="submit">ดูสรุป</Button>
        <Button asChild variant="ghost"><a href={`/reports?from=${addDaysISO(today, -6)}&to=${today}`}>7 วันล่าสุด</a></Button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['รายได้ดอกเบี้ย', sum('interest_amount')],
          ['จ่ายเงินกู้ออก', sum('cash_out')],
          ['รับเงินเข้า', sum('cash_in')],
          ['สัญญาใหม่', (txs ?? []).filter((t) => t.kind === 'loan').length],
        ].map(([k, v], i) => (
          <Card key={k as string}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-2xl font-bold tabular-nums text-primary">{i === 3 ? v : `฿${baht(v as number)}`}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {EXPORTS.map((e) => (
          <Card key={e.type}>
            <CardHeader><CardTitle className="text-lg">{e.title}</CardTitle><CardDescription>{e.desc}</CardDescription></CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="gap-1.5">
                <a href={`/api/export?type=${e.type}&${qs}`}><Download className="size-4" /> ดาวน์โหลด Excel</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">รายงานส่งหน่วยงานราชการ: ใช้ไฟล์สัญญาไปก่อน เมื่อได้แบบฟอร์มที่ต้องการ จะทำรูปแบบให้ตรง</p>
    </Page>
  );
}
