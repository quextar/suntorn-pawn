import { redirect } from 'next/navigation';
import { errorText } from '@/lib/format';

// กลับไปหน้าเดิมพร้อมข้อความแจ้ง (แสดงผ่าน <Flash />)
export function back(path: string, kind: 'error' | 'ok', message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(kind === 'error' ? errorText(message) : message)}`);
}

export const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
export const num = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').replace(/,/g, '').trim();
  return v === '' ? null : Number(v);
};
