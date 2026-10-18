import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';

async function createCustomer(formData: FormData) {
  'use server';
  const { supabase, profile } = await requireProfile();
  const nationalId = String(formData.get('national_id')).replace(/\D/g, '');
  if (nationalId.length !== 13) redirect('/customers/new?error=id');

  let photoPath: string | null = null;
  const photo = formData.get('id_card_photo') as File | null;
  if (photo && photo.size > 0) {
    photoPath = `${profile.branch_id}/${crypto.randomUUID()}-${photo.name.replace(/[^\w.]/g, '')}`;
    const { error } = await supabase.storage.from('id-cards').upload(photoPath, photo);
    if (error) redirect('/customers/new?error=photo');
  }

  const { data, error } = await supabase.from('customers').insert({
    branch_id: profile.branch_id,
    full_name: String(formData.get('full_name')).trim(),
    national_id: nationalId,
    phone: String(formData.get('phone') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    id_card_photo_path: photoPath,
    created_by: profile.id,
  }).select('id').single();
  if (error) redirect(`/customers/new?error=${error.code === '23505' ? 'dup' : 'save'}`);
  redirect(`/customers/${data!.id}`);
}

const ERRORS: Record<string, string> = {
  id: 'เลขบัตรประชาชนต้องมี 13 หลัก',
  dup: 'มีลูกค้าที่ใช้เลขบัตรนี้อยู่แล้ว',
  photo: 'อัปโหลดรูปบัตรไม่สำเร็จ',
  save: 'บันทึกไม่สำเร็จ',
};

const field = { width: '100%', height: 44, boxSizing: 'border-box' as const };

export default function NewCustomer({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <h1 style={{ color: '#0E2361' }}>เพิ่มลูกค้า</h1>
      <form action={createCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>ชื่อ-นามสกุล<input name="full_name" required style={field} /></label>
        <label>เลขบัตรประชาชน<input name="national_id" required inputMode="numeric" style={field} /></label>
        <label>เบอร์โทร<input name="phone" type="tel" style={field} /></label>
        <label>ที่อยู่<textarea name="address" rows={3} style={{ width: '100%', boxSizing: 'border-box' }} /></label>
        <label>รูปบัตรประชาชน<input name="id_card_photo" type="file" accept="image/*" capture="environment" /></label>
        {searchParams.error && <p style={{ color: '#A00D25', margin: 0 }}>{ERRORS[searchParams.error] ?? ERRORS.save}</p>}
        <button style={{ height: 44, background: '#0E2361', color: '#fff', border: 0, borderRadius: 8 }}>บันทึก</button>
      </form>
    </main>
  );
}
