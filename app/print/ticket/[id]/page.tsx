import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { baht, maskId, thDateLong } from '@/lib/format';
import { qrSvg, siteOrigin } from '@/lib/qr';
import { PrintButton } from '@/components/print-button';

export const metadata = { title: 'ตั๋วจำนำ' };

export default async function Ticket({ params }: { params: { id: string } }) {
  const { supabase } = await requireProfile();
  const { data: c } = await supabase.from('contracts')
    .select('*, branch:branches(name), customer:customers(full_name, national_id, phone, address), item:items(id, name, brand, model, serial_no, description)')
    .eq('id', params.id).single();
  if (!c || !c.start_date) notFound();
  const qr = await qrSvg(`${siteOrigin()}/contracts/${c.id}`);

  const Copy = ({ who }: { who: 'customer' | 'shop' }) => (
    <section className="flex h-[134mm] break-inside-avoid flex-col overflow-hidden border border-zinc-400 p-[6mm] text-[14px] leading-snug">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#0E2361] pb-2">
        <div>
          <div className="text-2xl font-bold text-[#0E2361]">สุนทรการค้า</div>
          <div className="text-zinc-600">{c.branch?.name} · ตั๋วจำนำ ({who === 'customer' ? 'ส่วนของลูกค้า' : 'ส่วนของร้าน'})</div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-zinc-500">เลขที่สัญญา</div>
            <div className="text-2xl font-bold tracking-wide text-[#C8102E]">{c.contract_no}</div>
          </div>
          <div className="size-[22mm]" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <div><span className="text-zinc-500">ผู้จำนำ </span><b>{c.customer.full_name}</b></div>
        <div><span className="text-zinc-500">เลขบัตรประชาชน </span>{who === 'shop' ? c.customer.national_id : maskId(c.customer.national_id)}</div>
        <div><span className="text-zinc-500">โทร </span>{c.customer.phone ?? '–'}</div>
        <div className="line-clamp-2"><span className="text-zinc-500">ที่อยู่ </span>{c.customer.address ?? '–'}</div>
      </div>

      <div className="mt-3 rounded border border-zinc-300 p-2">
        <div><span className="text-zinc-500">ทรัพย์ที่จำนำ </span><b>{c.item.name}</b></div>
        <div className="text-zinc-700">
          {[c.item.brand, c.item.model].filter(Boolean).join(' ')}{c.item.serial_no && ` · S/N ${c.item.serial_no}`}
        </div>
        {c.item.description && <div className="line-clamp-2 text-zinc-600">{c.item.description}</div>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ['เงินต้น', `${baht(c.principal)} บาท`],
          ['ดอกเบี้ย', `${c.interest_rate}% ต่อเดือน`],
          ['วันที่จำนำ', thDateLong(c.start_date)],
          ['ครบกำหนด', thDateLong(c.due_date)],
        ].map(([k, v]) => (
          <div key={k} className="rounded bg-zinc-100 p-1.5">
            <div className="text-[12px] text-zinc-500">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>

      <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-[12.5px] text-zinc-700">
        <li>ดอกเบี้ยคิด{c.interest_calc === 'daily' ? 'ตามจำนวนวันจริง' : 'เป็นรายเดือน เศษของเดือนนับเป็นหนึ่งเดือน'} ชำระดอกเบี้ยเพื่อต่อสัญญาได้ทุกเวลา</li>
        <li>หากไม่ไถ่ถอนหรือต่อดอกภายใน {c.grace_days} วันหลังวันครบกำหนด ทรัพย์ที่จำนำจะหลุดเป็นสิทธิ์ของร้าน</li>
        <li>กรุณานำตั๋วนี้และบัตรประชาชนมาทุกครั้งที่ต่อดอกหรือไถ่ถอน</li>
      </ol>

      <div className="mt-auto grid grid-cols-2 gap-10 pt-8 text-center">
        <div><div className="border-t border-dotted border-zinc-500 pt-1">ผู้จำนำ</div></div>
        <div><div className="border-t border-dotted border-zinc-500 pt-1">ผู้รับจำนำ</div></div>
      </div>
    </section>
  );

  return (
    <>
      <div className="mx-auto mb-4 flex w-[210mm] justify-end print:hidden"><PrintButton /></div>
      {/* ทั้งสองส่วนต้องพอดี A4 แผ่นเดียว: 134 + 6 + 134 = 274mm จากพื้นที่ 297 - 16 = 281mm */}
      <div className="mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white p-[8mm] shadow-lg print:shadow-none">
        <Copy who="customer" />
        <div className="flex h-[6mm] items-center gap-2 text-[10px] text-zinc-400">
          <div className="flex-1 border-t border-dashed border-zinc-400" /> ตัดตามรอยประ <div className="flex-1 border-t border-dashed border-zinc-400" />
        </div>
        <Copy who="shop" />
      </div>
      {/* ขอบกระดาษ 0 แล้วเว้นขอบเองข้างใน Chrome จะไม่ใส่หัว/ท้ายกระดาษและไม่ล้นไปหน้า 2 */}
      <style>{`@page { size: A4; margin: 0; } @media print { html, body { margin: 0; } }`}</style>
    </>
  );
}
