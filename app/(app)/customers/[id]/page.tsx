import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertOctagon, PackagePlus, Phone, MapPin, IdCard } from 'lucide-react';
import { requireProfile, requireCeo } from '@/lib/auth';
import { back, str } from '@/lib/actions';
import { baht, maskId, thDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';

async function setBlacklist(formData: FormData) {
  'use server';
  const { supabase } = await requireCeo();
  const id = str(formData, 'id');
  const on = formData.get('on') === '1';
  const { error } = await supabase.from('customers').update({
    is_blacklisted: on,
    blacklist_reason: on ? str(formData, 'reason') || null : null,
  }).eq('id', id);
  if (error) back(`/customers/${id}`, 'error', error.message);
  revalidatePath(`/customers/${id}`);
  back(`/customers/${id}`, 'ok', on ? 'เพิ่มเข้าบัญชีดำแล้ว' : 'นำออกจากบัญชีดำแล้ว');
}

async function updateCustomer(formData: FormData) {
  'use server';
  const { supabase } = await requireCeo();
  const id = str(formData, 'id');
  const nationalId = str(formData, 'national_id').replace(/\D/g, '');
  if (nationalId.length !== 13) back(`/customers/${id}`, 'error', 'เลขบัตรประชาชนต้องมี 13 หลัก');
  const { error } = await supabase.from('customers').update({
    full_name: str(formData, 'full_name'),
    national_id: nationalId,
    phone: str(formData, 'phone') || null,
    address: str(formData, 'address') || null,
    note: str(formData, 'note') || null,
  }).eq('id', id);
  if (error) back(`/customers/${id}`, 'error', error.code === '23505' ? 'เลขบัตรนี้ซ้ำกับลูกค้าคนอื่น' : error.message);
  back(`/customers/${id}`, 'ok', 'แก้ไขข้อมูลลูกค้าแล้ว');
}

export default async function CustomerPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string; edit?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { supabase, profile } = await requireProfile();
  const { data: c } = await supabase.from('customers').select('*').eq('id', params.id).single();
  if (!c) notFound();
  const isCeo = profile.role === 'ceo';
  const [photo, contracts] = await Promise.all([
    c.id_card_photo_path ? supabase.storage.from('id-cards').createSignedUrl(c.id_card_photo_path, 600) : null,
    supabase.from('contracts')
      .select('id, contract_no, status, principal, requested_amount, due_date, created_at, item:items(name)')
      .eq('customer_id', c.id).order('created_at', { ascending: false }),
  ]);
  const rows = contracts.data ?? [];
  const activePrincipal = rows.filter((r) => r.status === 'active').reduce((s, r) => s + Number(r.principal), 0);

  return (
    <Page>
      <PageHeader
        title={c.full_name}
        description={`ลูกค้าตั้งแต่ ${thDate(c.created_at)}`}
        actions={
          !c.is_blacklisted && (
            <Button asChild className="gap-1.5">
              <Link href={`/pawn/new?customer=${c.id}`}><PackagePlus className="size-4" /> รับจำนำ</Link>
            </Button>
          )
        }
      />
      <Flash searchParams={searchParams} />
      {c.is_blacklisted && (
        <div className="flex items-start gap-3 rounded-lg bg-destructive p-4 text-white">
          <AlertOctagon className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="font-semibold">ลูกค้าอยู่ในบัญชีดำ รับจำนำไม่ได้</div>
            {c.blacklist_reason && <div className="text-sm text-white/90">เหตุผล: {c.blacklist_reason}</div>}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">ข้อมูลลูกค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2"><IdCard className="size-4 text-muted-foreground" /> {isCeo ? c.national_id : maskId(c.national_id)}</div>
            <div className="flex gap-2"><Phone className="size-4 text-muted-foreground" /> {c.phone ?? '–'}</div>
            <div className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted-foreground" /> {c.address ?? '–'}</div>
            {c.note && <p className="rounded-md bg-muted p-2">{c.note}</p>}
            {photo?.data?.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.data.signedUrl} alt="รูปบัตรประชาชน" className="w-full rounded-lg border" />
            ) : (
              <p className="text-muted-foreground">ไม่มีรูปบัตรประชาชน</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">ประวัติสัญญา</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rows.length} สัญญา · ยอดต้นคงค้าง ฿{baht(activePrincipal)}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {!rows.length && <Empty>ยังไม่เคยจำนำ</Empty>}
            {rows.map((r) => (
              <Link key={r.id} href={`/contracts/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate font-medium">{(r.item as unknown as { name: string } | null)?.name}</div>
                  <div className="text-xs text-muted-foreground">{r.contract_no} · {thDate(r.created_at)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold tabular-nums">฿{baht(r.principal ?? r.requested_amount)}</div>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {isCeo && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">แก้ไขข้อมูล (ผู้บริหาร)</CardTitle></CardHeader>
            <CardContent>
              <form action={updateCustomer} className="grid gap-3">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid gap-1.5"><Label>ชื่อ-นามสกุล</Label><Input name="full_name" defaultValue={c.full_name} required /></div>
                <div className="grid gap-1.5"><Label>เลขบัตรประชาชน</Label><Input name="national_id" defaultValue={c.national_id} required inputMode="numeric" /></div>
                <div className="grid gap-1.5"><Label>เบอร์โทร</Label><Input name="phone" defaultValue={c.phone ?? ''} /></div>
                <div className="grid gap-1.5"><Label>ที่อยู่</Label><Textarea name="address" defaultValue={c.address ?? ''} rows={2} /></div>
                <div className="grid gap-1.5"><Label>บันทึกของผู้บริหาร</Label><Textarea name="note" defaultValue={c.note ?? ''} rows={2} /></div>
                <SubmitButton variant="outline">บันทึกการแก้ไข</SubmitButton>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">บัญชีดำ</CardTitle></CardHeader>
            <CardContent>
              <form action={setBlacklist} className="grid gap-3">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="on" value={c.is_blacklisted ? '0' : '1'} />
                {!c.is_blacklisted && (
                  <div className="grid gap-1.5"><Label>เหตุผล</Label><Input name="reason" placeholder="เช่น นำของโจรมาจำนำ" /></div>
                )}
                <SubmitButton
                  variant={c.is_blacklisted ? 'outline' : 'destructive'}
                  confirm={c.is_blacklisted ? 'นำลูกค้าออกจากบัญชีดำ?' : 'เพิ่มลูกค้าเข้าบัญชีดำ? พนักงานจะรับจำนำจากลูกค้านี้ไม่ได้'}
                >
                  {c.is_blacklisted ? 'นำออกจากบัญชีดำ' : 'เพิ่มเข้าบัญชีดำ'}
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  );
}
