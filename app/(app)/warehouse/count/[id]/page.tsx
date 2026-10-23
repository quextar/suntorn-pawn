import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { thDateTime } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Page, PageHeader } from '@/components/page-header';
import { closeCount } from '../../actions';
import { CountScanner } from './count-scanner';

type Item = { id: string; name: string; location_id: string | null; contract: { id: string; contract_no: string }[] | { id: string; contract_no: string } | null };

export default async function CountPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { supabase } = await requireProfile();
  const { data: count } = await supabase.from('stock_counts').select('*').eq('id', params.id).single();
  if (!count) notFound();
  const [{ data: items }, { data: scans }, { data: locations }] = await Promise.all([
    supabase.from('items').select('id, name, location_id, contract:contracts(id, contract_no)').in('status', ['in_storage', 'forfeited']).returns<Item[]>(),
    supabase.from('stock_count_scans').select('item_id, scanned_at').eq('count_id', count.id),
    supabase.from('locations').select('id, code'),
  ]);
  const scanned = new Set((scans ?? []).map((s) => s.item_id));
  const code = (id: string | null) => locations?.find((l) => l.id === id)?.code ?? 'ไม่มีช่อง';
  const missing = (items ?? []).filter((i) => !scanned.has(i.id)).sort((a, b) => code(a.location_id).localeCompare(code(b.location_id)));
  const found = (items ?? []).filter((i) => scanned.has(i.id));
  const open = count.status === 'open';
  const no = (i: Item) => (Array.isArray(i.contract) ? i.contract[0] : i.contract);

  return (
    <Page narrow>
      <PageHeader
        title={open ? 'กำลังตรวจนับ' : 'ผลตรวจนับ'}
        description={`เริ่ม ${thDateTime(count.started_at)}${count.closed_at ? ` · ปิด ${thDateTime(count.closed_at)}` : ''}`}
      />
      <Flash searchParams={searchParams} />
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">พบแล้ว</div><div className="text-3xl font-bold text-emerald-700">{found.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">ยังไม่พบ</div><div className="text-3xl font-bold text-destructive">{missing.length}</div></CardContent></Card>
      </div>
      {open && <CountScanner countId={count.id} locations={locations ?? []} />}
      <Card>
        <CardHeader><CardTitle className="text-lg">ยังไม่พบ ({missing.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {missing.map((i) => (
            <Link key={i.id} href={`/contracts/${no(i)?.id}`} className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
              <CircleDashed className="size-4 text-destructive" />
              <span className="w-20 shrink-0 font-mono text-xs">{code(i.location_id)}</span>
              <span className="truncate"><b>{no(i)?.contract_no}</b> {i.name}</span>
            </Link>
          ))}
          {!missing.length && <p className="text-sm text-emerald-700">ครบทุกชิ้น</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">พบแล้ว ({found.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {found.map((i) => (
            <div key={i.id} className="flex items-center gap-2 p-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="w-20 shrink-0 font-mono text-xs">{code(i.location_id)}</span>
              <span className="truncate"><b>{no(i)?.contract_no}</b> {i.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {open && (
        <form action={closeCount} className="flex gap-2">
          <input type="hidden" name="id" value={count.id} />
          <Input name="note" placeholder="หมายเหตุ (ถ้ามี)" className="h-11" />
          <SubmitButton size="lg" confirm={`ปิดรอบตรวจนับ? ยังไม่พบ ${missing.length} ชิ้น`}>ปิดรอบ</SubmitButton>
        </form>
      )}
    </Page>
  );
}
