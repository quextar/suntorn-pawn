'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrScanner, parseCode } from '@/components/qr-scanner';

export function ScanClient() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go(text: string) {
    const code = parseCode(text);
    if (code) {
      setBusy(true);
      router.push(code.type === 'item' ? `/i/${code.id}` : code.type === 'location' ? `/warehouse/${code.id}` : `/contracts/${code.id}`);
      return;
    }
    // พิมพ์เลขสัญญาเอง
    if (/^(pn-?)?\d+$/i.test(text.trim())) {
      router.push(`/contracts?f=all&q=${encodeURIComponent(text.trim())}`);
      return;
    }
    setMsg('QR นี้ไม่ใช่ของร้าน');
  }

  return (
    <div className="space-y-4">
      <QrScanner onScan={go} paused={busy} />
      {msg && <p className="text-center text-sm text-destructive">{msg}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go(String(new FormData(e.currentTarget).get('code') ?? ''));
        }}
      >
        <Input name="code" placeholder="หรือพิมพ์เลขสัญญา เช่น PN-000012" className="h-11 bg-card" />
        <Button type="submit" size="lg"><Search className="size-4" /></Button>
      </form>
    </div>
  );
}
