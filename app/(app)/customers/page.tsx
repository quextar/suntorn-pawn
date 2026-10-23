import Link from 'next/link';
import { ChevronRight, Search, UserPlus } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Empty, Page, PageHeader } from '@/components/page-header';
import { thDate } from '@/lib/format';

export default async function Customers(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireProfile();
  const q = searchParams.q?.trim().replace(/[,%()*]/g, '');
  let query = supabase.from('customers')
    .select('id, full_name, phone, national_id, is_blacklisted, created_at')
    .order('created_at', { ascending: false }).limit(100);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,national_id.ilike.%${q}%`);
  const { data: rows } = await query;

  return (
    <Page>
      <PageHeader
        title="ลูกค้า"
        description="ค้นหาด้วยชื่อ เบอร์โทร หรือเลขบัตรประชาชน"
        actions={
          <Button asChild className="gap-1.5">
            <Link href="/customers/new"><UserPlus className="size-4" /> เพิ่มลูกค้า</Link>
          </Button>
        }
      />
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="ชื่อ เบอร์โทร หรือเลขบัตร" className="h-11 bg-card" />
        <Button type="submit" size="lg" className="gap-1.5"><Search className="size-4" /> ค้นหา</Button>
      </form>
      {!rows?.length ? (
        <Empty>{q ? 'ไม่พบลูกค้าที่ตรงกับการค้นหา' : 'ยังไม่มีลูกค้าในระบบ'}</Empty>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {rows.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {c.full_name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{c.full_name}</span>
                    {c.is_blacklisted && <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">บัญชีดำ</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.phone ?? 'ไม่มีเบอร์โทร'} · เพิ่มเมื่อ {thDate(c.created_at)}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
