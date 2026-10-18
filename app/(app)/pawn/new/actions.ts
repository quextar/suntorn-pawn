'use server';

import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { back, num, str } from '@/lib/actions';

export async function createPawn(formData: FormData) {
  const { supabase } = await requireProfile();
  const customer = str(formData, 'customer_id');
  const self = `/pawn/new?customer=${customer}`;
  const checked = formData.getAll('checklist').map(String);
  const all = JSON.parse(str(formData, 'checklist_all') || '[]') as string[];
  const photos = JSON.parse(str(formData, 'photos') || '[]') as string[];
  if (!photos.length) back(self, 'error', 'กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป');

  const { data, error } = await supabase.rpc('create_pawn', {
    p_customer: customer,
    p_category: str(formData, 'category_id') || null,
    p_name: str(formData, 'name'),
    p_brand: str(formData, 'brand'),
    p_model: str(formData, 'model'),
    p_serial: str(formData, 'serial_no'),
    p_description: str(formData, 'description'),
    p_checklist: Object.fromEntries(all.map((k) => [k, checked.includes(k)])),
    p_photos: photos,
    p_appraised: num(formData, 'appraised_value'),
    p_requested: num(formData, 'requested_amount'),
  });
  if (error) back(self, 'error', error.message);
  redirect(`/contracts/${data}?ok=${encodeURIComponent('บันทึกแล้ว ส่งให้ผู้บริหารอนุมัติวงเงิน')}`);
}
