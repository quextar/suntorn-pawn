import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { ITEM_STATUS, thDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { deleteLocation } from '../actions';

export default async function LocationPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  const { supabase, profile } = await requireProfile();
  const { data: loc } = await supabase.from('locations').select('*').eq('id', params.id).single();
  if (!loc) notFound();
  const [{ data: items }, { data: moves }] = await Promise.all([
    supabase.from('items').select('id, name, status, contract:contracts(id, contract_no)').eq('location_id', loc.id),
    supabase.from('item_movements').select('id, created_at, note, from_location, to_location, item:items(name), by:profiles(full_name)')
      .or(`from_location.eq.${loc.id},to_location.eq.${loc.id}`).order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <Page narrow>
      <PageHeader
        title={`ช่อง ${loc.code}`}
        description={loc.note ?? `โซน ${loc.zone} ชั้น ${loc.shelf} ช่อง ${loc.slot}`}
        actions={<Button asChild variant="outline" className="gap-1.5"><Link href={`/print/labels?locations=${loc.id}`} target="_blank"><Printer className="size-4" /> พิมพ์ QR ช่องนี้</Link></Button>}
      />
      <Flash searchParams={searchParams} />
      <Card>
        <CardHeader><CardTitle className="text-lg">ของในช่อง ({items?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!items?.length && <Empty>ช่องว่าง</Empty>}
          {items?.map((it) => {
            const c = (Array.isArray(it.contract) ? it.contract[0] : it.contract) as { id: string; contract_no: string } | null;
            return (
              <Link key={it.id} href={`/contracts/${c?.id}`} className="flex justify-between rounded-lg border p-3 text-sm hover:bg-accent">
                <span><b>{c?.contract_no}</b> {it.name}</span>
                <span className="text-muted-foreground">{ITEM_STATUS[it.status]}</span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">ประวัติการย้าย</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!moves?.length && <Empty>ยังไม่มีประวัติ</Empty>}
          {moves?.map((m) => (
            <div key={m.id} className="flex justify-between gap-3 border-b py-1.5 last:border-0">
              <span>
                {m.to_location === loc.id ? 'นำเข้า' : 'นำออก'} {(m.item as unknown as { name: string } | null)?.name}
                {m.note && <span className="text-muted-foreground"> · {m.note}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{(m.by as unknown as { full_name: string } | null)?.full_name} {thDateTime(m.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {profile.role === 'ceo' && !items?.length && (
        <form action={deleteLocation}>
          <input type="hidden" name="id" value={loc.id} />
          <SubmitButton variant="outline" className="text-destructive" confirm={`ลบช่อง ${loc.code}?`}>ลบช่องนี้</SubmitButton>
        </form>
      )}
    </Page>
  );
}
