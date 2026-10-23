import { headers } from 'next/headers';
import QRCode from 'qrcode';

// ลิงก์เต็มของเว็บนี้ เพื่อให้สแกน QR ด้วยกล้องมือถือธรรมดาก็เปิดได้
export async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const qrSvg = (text: string) => QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
