import { CONTRACT_STATUS } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (status === 'active' && overdue) {
    return <span className="inline-flex rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white">เกินกำหนด</span>;
  }
  const s = CONTRACT_STATUS[status] ?? { label: status, className: 'bg-muted' };
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>;
}
