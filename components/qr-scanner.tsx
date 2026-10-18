'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

// สแกน QR ด้วยกล้องหลังของมือถือ/แท็บเล็ต เรียก onScan เมื่ออ่านได้ (กันอ่านซ้ำภายใน 2 วินาที)
export function QrScanner({ onScan, paused = false }: { onScan: (text: string) => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const cb = useRef(onScan);
  cb.current = onScan;
  const [error, setError] = useState<string | null>(null);
  const scanner = useRef<{ start(): Promise<void>; stop(): void; destroy(): void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QrScannerLib } = await import('qr-scanner');
      if (cancelled || !video.current) return;
      const s = new QrScannerLib(
        video.current,
        (r) => {
          const now = Date.now();
          if (r.data === last.current.text && now - last.current.at < 2000) return;
          last.current = { text: r.data, at: now };
          navigator.vibrate?.(60);
          cb.current(r.data);
        },
        { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
      );
      scanner.current = s;
      try {
        await s.start();
      } catch {
        setError('เปิดกล้องไม่ได้ อนุญาตให้เว็บใช้กล้อง หรือพิมพ์รหัสด้านล่างแทน');
      }
    })();
    return () => {
      cancelled = true;
      scanner.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!scanner.current) return;
    if (paused) scanner.current.stop();
    else scanner.current.start().catch(() => undefined);
  }, [paused]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={video} className="aspect-square w-full object-cover sm:aspect-video" muted playsInline />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white">
          <CameraOff className="size-8" /> {error}
        </div>
      )}
    </div>
  );
}

// แปลงข้อความใน QR เป็น { type, id } (QR ของเราเป็นลิงก์ .../i/<id> หรือ .../l/<id>)
export function parseCode(text: string): { type: 'item' | 'location' | 'contract'; id: string } | null {
  const m = text.match(/\/(i|l|contracts)\/([0-9a-f-]{36})/i);
  if (m) return { type: m[1] === 'i' ? 'item' : m[1] === 'l' ? 'location' : 'contract', id: m[2] };
  return null;
}
