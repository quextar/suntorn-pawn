import { redirect } from 'next/navigation';

// ปลายทางของ QR บนช่องเก็บ
export default async function LocationQr(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  redirect(`/warehouse/${params.id}`);
}
