'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { QrScanner, parseCode } from '@/components/qr-scanner';
import { cn } from '@/lib/utils';
import { scanCountItem } from '../../actions';

export function CountScanner({ countId, locations }: { countId: string; locations: { id: string; code: string }[] }) {
  const router = useRouter();
  const [location, setLocation] = useState<string | null>(null);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);
  const [, startTransition] = useTransition();

  async function onScan(text: string) {
    const code = parseCode(text);
    if (!code) return setLog((l) => [{ ok: false, text: 'QR นี้ไม่ใช่ของร้าน' }, ...l]);
    if (code.type === 'location') {
      setLocation(code.id);
      return setLog((l) => [{ ok: true, text: `อยู่ที่ช่อง ${locations.find((x) => x.id === code.id)?.code ?? ''}` }, ...l]);
    }
    if (code.type !== 'item') return setLog((l) => [{ ok: false, text: 'สแกนสติกเกอร์สินค้าหรือช่องเก็บ' }, ...l]);
    const r = await scanCountItem(countId, code.id, location);
    setLog((l) => [{ ok: r.ok, text: `${r.name ?? ''} ${r.message}`.trim() }, ...l].slice(0, 8));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <MapPin className="size-4 text-primary" />
        {location ? <>กำลังนับช่อง <b>{locations.find((l) => l.id === location)?.code}</b></> : 'สแกน QR ของช่องก่อน (ไม่บังคับ) แล้วสแกนสินค้าทีละชิ้น'}
      </div>
      <QrScanner onScan={onScan} />
      <div className="space-y-1">
        {log.map((l, i) => (
          <div key={i} className={cn('rounded-md px-3 py-2 text-sm', l.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900', i === 0 && 'font-semibold')}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
