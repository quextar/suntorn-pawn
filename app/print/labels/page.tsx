import { requireProfile } from '@/lib/auth';
import { qrSvg, siteOrigin } from '@/lib/qr';
import { PrintButton } from '@/components/print-button';

export const metadata = { title: 'สติกเกอร์ QR' };

// สติกเกอร์ QR สำหรับสินค้า (?items=id,id) หรือช่องเก็บ (?locations=all หรือ id,id)
export default async function Labels({ searchParams }: { searchParams: { items?: string; locations?: string } }) {
  const { supabase } = await requireProfile();
  const origin = siteOrigin();
  const labels: { key: string; qr: string; title: string; sub: string }[] = [];

  if (searchParams.items) {
    const ids = searchParams.items.split(',').filter(Boolean);
    const { data } = await supabase.from('items')
      .select('id, name, contract:contracts(contract_no), location:locations(code)').in('id', ids);
    for (const it of data ?? []) {
      const contract = (it.contract as unknown as { contract_no: string }[] | { contract_no: string } | null);
      const no = Array.isArray(contract) ? contract[0]?.contract_no : contract?.contract_no;
      labels.push({
        key: it.id, qr: await qrSvg(`${origin}/i/${it.id}`), title: no ?? '',
        sub: `${it.name}${(it.location as unknown as { code: string } | null)?.code ? ` · ${(it.location as unknown as { code: string }).code}` : ''}`,
      });
    }
  }
  if (searchParams.locations) {
    let q = supabase.from('locations').select('id, code, note').order('code');
    if (searchParams.locations !== 'all') q = q.in('id', searchParams.locations.split(','));
    const { data } = await q;
    for (const l of data ?? []) {
      labels.push({ key: l.id, qr: await qrSvg(`${origin}/l/${l.id}`), title: l.code, sub: l.note ?? 'ตำแหน่งเก็บ โซน-ชั้น-ช่อง' });
    }
  }

  return (
    <>
      <div className="mx-auto mb-4 flex w-[210mm] items-center justify-between print:hidden">
        <span className="text-sm text-zinc-600">{labels.length} ดวง · ขนาดดวงละ 6 × 3.5 ซม.</span>
        <PrintButton />
      </div>
      <div className="mx-auto grid w-[210mm] grid-cols-3 gap-[3mm] bg-white p-[8mm] shadow-lg print:w-auto print:p-0 print:shadow-none">
        {labels.map((l) => (
          <div key={l.key} className="flex h-[35mm] items-center gap-[3mm] rounded border border-zinc-400 p-[2.5mm] [break-inside:avoid]">
            <div className="size-[28mm] shrink-0" dangerouslySetInnerHTML={{ __html: l.qr }} />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-[#0E2361]">สุนทรการค้า</div>
              <div className="text-base font-bold leading-tight text-[#C8102E]">{l.title}</div>
              <div className="line-clamp-3 text-[10px] leading-tight text-zinc-700">{l.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <style>{`@page { size: A4; margin: 8mm; }`}</style>
    </>
  );
}
