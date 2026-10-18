import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { requireCeo } from '@/lib/auth';
import { baht, thDateTime } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { approve, reject } from '../contracts/[id]/actions';

export default async function Approvals({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase } = await requireCeo();
  const { data: rows } = await supabase.from('contracts')
    .select(`id, contract_no, appraised_value, requested_amount, created_at,
             customer:customers(full_name, phone), item:items(name, photos, checklist, description, category:item_categories(name)),
             created:profiles!contracts_created_by_fkey(full_name)`)
    .eq('status', 'pending').order('created_at');

  const firstPhotos = (rows ?? []).map((r) => (r.item as unknown as { photos: string[] }).photos?.[0]).filter(Boolean) as string[];
  const { data: signed } = firstPhotos.length
    ? await supabase.storage.from('item-photos').createSignedUrls(firstPhotos, 600)
    : { data: [] };
  const urlOf = (p?: string) => signed?.find((s) => s.path === p)?.signedUrl;

  return (
    <Page>
      <PageHeader title="อนุมัติวงเงิน" description="รายการที่พนักงานรับเข้ามาและรอให้ผู้บริหารกำหนดวงเงิน" />
      <Flash searchParams={searchParams} />
      {!rows?.length && <Empty>ไม่มีรายการรออนุมัติ</Empty>}
      <div className="grid gap-4">
        {rows?.map((r) => {
          const item = r.item as unknown as { name: string; photos: string[]; checklist: Record<string, boolean>; description: string | null; category: { name: string } | null };
          const customer = r.customer as unknown as { full_name: string; phone: string | null };
          const checks = Object.values(item.checklist ?? {});
          const photo = urlOf(item.photos?.[0]);
          return (
            <Card key={r.id}>
              <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr_300px]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="aspect-square w-full rounded-lg border object-cover md:w-40" />
                ) : <div className="aspect-square w-full rounded-lg bg-muted md:w-40" />}
                <div className="min-w-0 space-y-1">
                  <Link href={`/contracts/${r.id}`} className="text-lg font-semibold text-primary hover:underline">{item.name}</Link>
                  <div className="text-sm text-muted-foreground">{item.category?.name} · {r.contract_no}</div>
                  <div className="text-sm">ลูกค้า {customer.full_name} · {customer.phone ?? '–'}</div>
                  <div className="text-sm">เช็กลิสต์ผ่าน {checks.filter(Boolean).length}/{checks.length} ข้อ</div>
                  {item.description && <div className="line-clamp-2 text-sm text-muted-foreground">{item.description}</div>}
                  <div className="text-xs text-muted-foreground">รับโดย {(r.created as unknown as { full_name: string } | null)?.full_name} · {thDateTime(r.created_at)}</div>
                  <div className="flex gap-4 pt-1 text-sm">
                    <span>ประเมิน <b>฿{baht(r.appraised_value)}</b></span>
                    <span>ลูกค้าขอ <b>฿{baht(r.requested_amount)}</b></span>
                  </div>
                </div>
                <div className="grid content-start gap-2">
                  <form action={approve} className="grid gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="return_to" value="/approvals" />
                    <Input name="principal" required inputMode="decimal" defaultValue={Number(r.requested_amount)} className="h-11 text-lg" aria-label="วงเงินที่อนุมัติ" />
                    <SubmitButton className="gap-1.5"><CheckCircle2 className="size-4" /> อนุมัติวงเงินนี้</SubmitButton>
                  </form>
                  <form action={reject} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="return_to" value="/approvals" />
                    <Input name="note" placeholder="เหตุผล" />
                    <SubmitButton variant="outline" className="shrink-0 text-destructive" confirm="ไม่อนุมัติรายการนี้?"><XCircle className="size-4" /></SubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
