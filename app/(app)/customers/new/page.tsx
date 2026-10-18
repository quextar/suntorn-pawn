import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { back, str } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Page, PageHeader } from '@/components/page-header';
import { PhotoUpload } from '@/components/photo-upload';

async function createCustomer(formData: FormData) {
  'use server';
  const { supabase, profile } = await requireProfile();
  const next = str(formData, 'next');
  const self = `/customers/new${next ? `?next=${next}` : ''}`;
  const nationalId = str(formData, 'national_id').replace(/\D/g, '');
  if (nationalId.length !== 13) back(self, 'error', 'เลขบัตรประชาชนต้องมี 13 หลัก');

  const { data: existing } = await supabase.from('customers').select('id').eq('national_id', nationalId).maybeSingle();
  if (existing) back(`/customers/${existing.id}`, 'error', 'มีลูกค้าที่ใช้เลขบัตรนี้อยู่แล้ว เปิดข้อมูลเดิมให้แทน');

  const { data, error } = await supabase.from('customers').insert({
    branch_id: profile.branch_id,
    full_name: str(formData, 'full_name'),
    national_id: nationalId,
    phone: str(formData, 'phone') || null,
    address: str(formData, 'address') || null,
    id_card_photo_path: str(formData, 'id_card_photo') || null,
    created_by: profile.id,
  }).select('id').single();
  if (error) back(self, 'error', error.message);
  redirect(next === 'pawn' ? `/pawn/new?customer=${data!.id}` : `/customers/${data!.id}?ok=${encodeURIComponent('บันทึกลูกค้าแล้ว')}`);
}

export default async function NewCustomer({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const { profile } = await requireProfile();
  return (
    <Page narrow>
      <PageHeader title="เพิ่มลูกค้า" description="กรอกข้อมูลตามบัตรประชาชน และถ่ายรูปบัตรเก็บไว้" />
      <Flash searchParams={searchParams} />
      <Card>
        <CardContent className="pt-6">
          <form action={createCustomer} className="grid gap-4">
            <input type="hidden" name="next" value={searchParams.next ?? ''} />
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
              <Input id="full_name" name="full_name" required className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="national_id">เลขบัตรประชาชน 13 หลัก</Label>
              <Input id="national_id" name="national_id" required inputMode="numeric" maxLength={17} className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input id="phone" name="phone" type="tel" className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">ที่อยู่</Label>
              <Textarea id="address" name="address" rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>รูปบัตรประชาชน</Label>
              <PhotoUpload bucket="id-cards" branchId={profile.branch_id} name="id_card_photo" multiple={false} label="ถ่ายรูปบัตร" />
            </div>
            <SubmitButton size="lg">บันทึกลูกค้า</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
