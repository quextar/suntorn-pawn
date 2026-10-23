import { notFound, redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';

// ปลายทางของ QR บนสติกเกอร์สินค้า: เปิดสัญญาของสินค้านั้น
export default async function ItemQr(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { supabase } = await requireProfile();
  const { data } = await supabase.from('contracts').select('id').eq('item_id', params.id).maybeSingle();
  if (!data) notFound();
  redirect(`/contracts/${data.id}`);
}
