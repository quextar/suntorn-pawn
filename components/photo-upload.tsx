'use client';

import { useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ย่อรูปจากกล้องมือถือก่อนอัปโหลด (รูปเต็มหลาย MB เกินขนาดที่เซิร์ฟเวอร์รับ)
async function shrink(file: File, max = 1600): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))), 'image/jpeg', 0.82),
  );
}

type Photo = { path: string; preview: string };

export function PhotoUpload({
  bucket, branchId, name, multiple = true, label = 'ถ่ายรูป / เลือกรูป', required = false,
}: {
  bucket: 'item-photos' | 'id-cards';
  branchId: string;
  name: string;
  multiple?: boolean;
  label?: string;
  required?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const added: Photo[] = [];
    try {
      for (const file of Array.from(files)) {
        const blob = await shrink(file);
        const path = `${branchId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        added.push({ path, preview: URL.createObjectURL(blob) });
      }
      setPhotos((prev) => (multiple ? [...prev, ...added] : added));
    } catch (e) {
      setError(`อัปโหลดรูปไม่สำเร็จ ${(e as Error).message ?? ''}`);
    } finally {
      setBusy(false);
    }
  }

  const value = multiple ? JSON.stringify(photos.map((p) => p.path)) : (photos[0]?.path ?? '');

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.path} className="relative size-24 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="ลบรูป"
              onClick={() => setPhotos((prev) => prev.filter((x) => x.path !== p.path))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {(multiple || photos.length === 0) && (
          <label
            className={cn(
              'flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            <span className="px-1 text-center">{busy ? 'กำลังอัปโหลด' : label}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple={multiple}
              className="sr-only"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      {required && photos.length === 0 && <p className="text-xs text-muted-foreground">ต้องมีอย่างน้อย 1 รูป</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
