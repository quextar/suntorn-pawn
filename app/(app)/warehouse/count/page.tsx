import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { thDateTime } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { startCount } from '../actions';

export default async function Counts(props: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireProfile();
  const { data: counts } = await supabase.from('stock_counts')
    .select('id, status, expected_count, found_count, started_at, closed_at, by:profiles!stock_counts_started_by_fkey(full_name)')
    .order('started_at', { ascending: false }).limit(30);
  const open = counts?.find((c) => c.status === 'open');

  return (
    <Page narrow>
      <PageHeader title="ตรวจนับสต๊อก" description="เดินสแกนสติกเกอร์ QR ของทุกชิ้นในคลัง ระบบจะบอกว่าชิ้นไหนหาไม่เจอ" />
      <Flash searchParams={searchParams} />
      {open ? (
        <Link href={`/warehouse/count/${open.id}`} className="block rounded-lg bg-primary p-4 text-primary-foreground">
          มีรอบตรวจนับที่ยังเปิดอยู่ แตะเพื่อสแกนต่อ →
        </Link>
      ) : (
        <form action={startCount}><SubmitButton size="lg" className="w-full">เริ่มรอบตรวจนับใหม่</SubmitButton></form>
      )}
      <Card>
        <CardContent className="divide-y p-0">
          {!counts?.length && <div className="p-4"><Empty>ยังไม่เคยตรวจนับ</Empty></div>}
          {counts?.map((c) => {
            const missing = (c.expected_count ?? 0) - (c.found_count ?? 0);
            return (
              <Link key={c.id} href={`/warehouse/count/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                <div className="flex-1">
                  <div className="font-medium">{thDateTime(c.started_at)} · {(c.by as unknown as { full_name: string } | null)?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.status === 'open' ? 'กำลังนับ' : `พบ ${c.found_count}/${c.expected_count} ชิ้น`}
                    {c.status === 'closed' && missing > 0 && <span className="font-semibold text-destructive"> · ขาด {missing} ชิ้น</span>}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </Page>
  );
}
