import Link from 'next/link';
import { AlertOctagon, ChevronRight, Search, UserPlus } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { maskId } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { PawnForm } from './pawn-form';

export default async function NewPawn({ searchParams }: { searchParams: { customer?: string; q?: string; error?: string; ok?: string } }) {
  const { supabase, profile } = await requireProfile();

  // ขั้นที่ 1: เลือกลูกค้า
  if (!searchParams.customer) {
    const q = searchParams.q?.trim().replace(/[,%()*]/g, '');
    const { data: found } = q
      ? await supabase.from('customers').select('id, full_name, phone, national_id, is_blacklisted')
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,national_id.ilike.%${q}%`).limit(20)
      : { data: null };
    return (
      <Page narrow>
        <PageHeader title="รับจำนำใหม่" description="ขั้นที่ 1: เลือกลูกค้า ระบบจะเตือนถ้าลูกค้าอยู่ในบัญชีดำ" />
        <Flash searchParams={searchParams} />
        <form className="flex gap-2">
          <Input name="q" defaultValue={q} autoFocus placeholder="ชื่อ เบอร์โทร หรือเลขบัตรประชาชน" className="h-11 bg-card" />
          <Button type="submit" size="lg" className="gap-1.5"><Search className="size-4" /> ค้นหา</Button>
        </form>
        {found && (found.length ? (
          <Card>
            <CardContent className="divide-y p-0">
              {found.map((c) => c.is_blacklisted ? (
                <div key={c.id} className="flex items-center gap-3 bg-destructive/5 px-4 py-3">
                  <AlertOctagon className="size-5 text-destructive" />
                  <div className="flex-1">
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs font-semibold text-destructive">อยู่ในบัญชีดำ รับจำนำไม่ได้</div>
                  </div>
                </div>
              ) : (
                <Link key={c.id} href={`/pawn/new?customer=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                  <div className="flex-1">
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone ?? '–'} · {maskId(c.national_id)}</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : <Empty>ไม่พบลูกค้า เพิ่มลูกค้าใหม่ได้เลย</Empty>)}
        <Button asChild variant="outline" size="lg" className="w-full gap-1.5">
          <Link href="/customers/new?next=pawn"><UserPlus className="size-4" /> ลูกค้าใหม่ (ยังไม่มีในระบบ)</Link>
        </Button>
      </Page>
    );
  }

  // ขั้นที่ 2: บันทึกสินค้า
  const [{ data: customer }, { data: categories }] = await Promise.all([
    supabase.from('customers').select('id, full_name, phone, national_id, is_blacklisted, blacklist_reason').eq('id', searchParams.customer).single(),
    supabase.from('item_categories').select('id, name, checklist').order('sort'),
  ]);
  if (!customer) return <Page narrow><Empty>ไม่พบลูกค้า</Empty></Page>;

  return (
    <Page>
      <PageHeader title="รับจำนำใหม่" description="ขั้นที่ 2: บันทึกสินค้า ทดสอบ และเสนอราคา" />
      <Flash searchParams={searchParams} />
      <Card className={customer.is_blacklisted ? 'border-destructive bg-destructive/5' : ''}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="text-xs text-muted-foreground">ลูกค้า</div>
            <div className="font-semibold">{customer.full_name}</div>
            <div className="text-xs text-muted-foreground">{customer.phone ?? '–'} · {maskId(customer.national_id)}</div>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/pawn/new">เปลี่ยนลูกค้า</Link></Button>
        </CardContent>
      </Card>
      {customer.is_blacklisted ? (
        <div className="flex items-start gap-3 rounded-lg bg-destructive p-4 text-white">
          <AlertOctagon className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="font-semibold">ลูกค้าอยู่ในบัญชีดำ รับจำนำไม่ได้</div>
            {customer.blacklist_reason && <div className="text-sm">เหตุผล: {customer.blacklist_reason}</div>}
          </div>
        </div>
      ) : (
        <PawnForm customerId={customer.id} branchId={profile.branch_id} categories={categories ?? []} />
      )}
    </Page>
  );
}
