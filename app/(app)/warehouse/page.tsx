import Link from 'next/link';
import { ClipboardCheck, PackageOpen, Printer, ScanLine } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { addLocations, placeItem } from './actions';

type ItemRow = { id: string; name: string; status: string; location_id: string | null; contract: { id: string; contract_no: string }[] | { id: string; contract_no: string } | null };
const contractOf = (it: ItemRow) => (Array.isArray(it.contract) ? it.contract[0] : it.contract);

export default async function Warehouse(props: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireProfile();
  const [{ data: locations }, { data: items }] = await Promise.all([
    supabase.from('locations').select('id, zone, shelf, slot, code').order('zone').order('shelf').order('slot'),
    supabase.from('items').select('id, name, status, location_id, contract:contracts(id, contract_no)').in('status', ['in_storage', 'forfeited']).returns<ItemRow[]>(),
  ]);
  const count = new Map<string, number>();
  for (const it of items ?? []) if (it.location_id) count.set(it.location_id, (count.get(it.location_id) ?? 0) + 1);
  const unplaced = (items ?? []).filter((i) => !i.location_id);
  const forSale = (items ?? []).filter((i) => i.status === 'forfeited');
  const zones = Array.from(new Set((locations ?? []).map((l) => `${l.zone}-${l.shelf}`)));

  return (
    <Page>
      <PageHeader
        title="คลังสินค้า"
        description={`ของในคลัง ${items?.length ?? 0} ชิ้น · ${locations?.length ?? 0} ช่องเก็บ`}
        actions={
          <>
            <Button asChild variant="outline" className="gap-1.5"><Link href="/scan"><ScanLine className="size-4" /> สแกน</Link></Button>
            <Button asChild variant="outline" className="gap-1.5"><Link href="/print/labels?locations=all" target="_blank"><Printer className="size-4" /> พิมพ์ QR ช่องเก็บ</Link></Button>
            <Button asChild className="gap-1.5"><Link href="/warehouse/count"><ClipboardCheck className="size-4" /> ตรวจนับสต๊อก</Link></Button>
          </>
        }
      />
      <Flash searchParams={searchParams} />

      {unplaced.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><PackageOpen className="size-5 text-amber-600" /> ยังไม่ได้เก็บเข้าช่อง ({unplaced.length})</CardTitle>
            <CardDescription>เลือกช่องแล้วกดบันทึก จากนั้นติดสติกเกอร์ QR ที่ตัวสินค้า</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unplaced.map((it) => (
              <form key={it.id} action={placeItem} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <input type="hidden" name="item_id" value={it.id} />
                <Link href={`/contracts/${contractOf(it)?.id}`} className="min-w-0 flex-1 text-sm">
                  <b>{contractOf(it)?.contract_no}</b> {it.name}
                </Link>
                <NativeSelect name="location_id" required defaultValue="" className="w-32">
                  <option value="" disabled>เลือกช่อง</option>
                  {locations?.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
                </NativeSelect>
                <SubmitButton size="sm">บันทึก</SubmitButton>
              </form>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">ช่องเก็บ</CardTitle><CardDescription>ตัวเลขคือจำนวนของในช่อง แตะเพื่อดูรายการ</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {!zones.length && <Empty>ยังไม่มีตำแหน่งเก็บ เพิ่มด้านล่าง</Empty>}
          {zones.map((z) => (
            <div key={z}>
              <div className="mb-1.5 text-sm font-semibold text-muted-foreground">โซน-ชั้น {z}</div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
                {locations!.filter((l) => `${l.zone}-${l.shelf}` === z).map((l) => {
                  const n = count.get(l.id) ?? 0;
                  return (
                    <Link
                      key={l.id} href={`/warehouse/${l.id}`}
                      className={cn('rounded-lg border p-2 text-center hover:border-primary', n > 0 ? 'bg-primary/5' : 'bg-card')}
                    >
                      <div className="text-xs text-muted-foreground">{l.slot}</div>
                      <div className={cn('text-lg font-bold', n > 0 ? 'text-primary' : 'text-muted-foreground/50')}>{n}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">หลุดจำนำ รอขาย ({forSale.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!forSale.length && <Empty>ไม่มีของหลุดจำนำ</Empty>}
            {forSale.map((it) => (
              <Link key={it.id} href={`/contracts/${contractOf(it)?.id}`} className="block rounded-lg border p-2 text-sm hover:bg-accent">
                <b>{contractOf(it)?.contract_no}</b> {it.name}
                <span className="text-muted-foreground"> · {locations?.find((l) => l.id === it.location_id)?.code ?? 'ไม่มีช่อง'}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">เพิ่มช่องเก็บ</CardTitle><CardDescription>เช่น โซน C ชั้น 1 ช่อง 1 ถึง 10</CardDescription></CardHeader>
          <CardContent>
            <form action={addLocations} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="grid gap-1.5"><Label>โซน</Label><Input name="zone" required placeholder="C" /></div>
              <div className="grid gap-1.5"><Label>ชั้น</Label><Input name="shelf" required placeholder="1" /></div>
              <div className="grid gap-1.5"><Label>ช่องเริ่ม</Label><Input name="slot_from" required inputMode="numeric" defaultValue="1" /></div>
              <div className="grid gap-1.5"><Label>ถึงช่อง</Label><Input name="slot_to" required inputMode="numeric" defaultValue="10" /></div>
              <div className="col-span-2 grid gap-1.5 sm:col-span-4"><Label>หมายเหตุ</Label><Input name="note" placeholder="เช่น ตู้เซฟหลังร้าน" /></div>
              <SubmitButton className="col-span-2 sm:col-span-4">เพิ่มช่องเก็บ</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
