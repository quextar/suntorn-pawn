import { CheckCircle2, XCircle } from 'lucide-react';

// ข้อความหลังทำรายการ มาจาก ?error= หรือ ?ok= ใน URL
export function Flash({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  if (!searchParams.error && !searchParams.ok) return null;
  const isError = Boolean(searchParams.error);
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={
        isError
          ? 'flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'
          : 'flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800'
      }
    >
      {isError ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <span>{searchParams.error ?? searchParams.ok}</span>
    </div>
  );
}
