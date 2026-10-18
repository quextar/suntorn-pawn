import { redirect } from 'next/navigation';

// ปลายทางของ QR บนช่องเก็บ
export default function LocationQr({ params }: { params: { id: string } }) {
  redirect(`/warehouse/${params.id}`);
}
