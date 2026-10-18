import ExcelJS from 'exceljs';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CONTRACT_STATUS, ITEM_STATUS, TX_KIND } from '@/lib/format';

const TZ = 'Asia/Bangkok';
const d = (v: string | null) => (v ? new Date(v) : null);
const thTime = (v: string) => new Intl.DateTimeFormat('th-TH', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));

// ส่งออก Excel (ผู้บริหารเท่านั้น): /api/export?type=contracts|transactions|customers|stock&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'ceo') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const type = p.get('type') ?? 'contracts';
  const from = p.get('from');
  const to = p.get('to');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'สุนทรการค้า';
  const ws = wb.addWorksheet(type);
  const range = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T, col: string) => {
    let r = q;
    if (from) r = r.gte(col, `${from}T00:00:00+07:00`);
    if (to) r = r.lte(col, `${to}T23:59:59.999+07:00`);
    return r;
  };

  if (type === 'contracts') {
    ws.columns = [
      { header: 'เลขสัญญา', key: 'no', width: 12 }, { header: 'สถานะ', key: 'status', width: 12 },
      { header: 'ลูกค้า', key: 'customer', width: 24 }, { header: 'เลขบัตร', key: 'nid', width: 16 }, { header: 'โทร', key: 'phone', width: 13 },
      { header: 'สินค้า', key: 'item', width: 30 }, { header: 'ประเภท', key: 'cat', width: 16 }, { header: 'S/N', key: 'sn', width: 18 },
      { header: 'ราคาประเมิน', key: 'appraised', width: 13 }, { header: 'เงินต้น', key: 'principal', width: 12 },
      { header: 'ดอกเบี้ย %/เดือน', key: 'rate', width: 10 }, { header: 'วันเริ่ม', key: 'start', width: 12 },
      { header: 'ครบกำหนด', key: 'due', width: 12 }, { header: 'ตำแหน่ง', key: 'loc', width: 10 }, { header: 'สร้างเมื่อ', key: 'created', width: 18 },
    ];
    const { data } = await range(supabase.from('contracts').select(
      'contract_no, status, appraised_value, principal, interest_rate, start_date, due_date, created_at, customer:customers(full_name, national_id, phone), item:items(name, serial_no, category:item_categories(name), location:locations(code))',
    ), 'created_at').order('created_at');
    for (const c of data ?? []) {
      const cu = c.customer as unknown as { full_name: string; national_id: string; phone: string | null };
      const it = c.item as unknown as { name: string; serial_no: string | null; category: { name: string } | null; location: { code: string } | null };
      ws.addRow({
        no: c.contract_no, status: CONTRACT_STATUS[c.status]?.label ?? c.status, customer: cu.full_name, nid: cu.national_id, phone: cu.phone,
        item: it.name, cat: it.category?.name, sn: it.serial_no, appraised: Number(c.appraised_value), principal: c.principal ? Number(c.principal) : null,
        rate: Number(c.interest_rate), start: d(c.start_date), due: d(c.due_date), loc: it.location?.code, created: thTime(c.created_at),
      });
    }
  } else if (type === 'transactions') {
    ws.columns = [
      { header: 'วันเวลา', key: 'at', width: 18 }, { header: 'เลขสัญญา', key: 'no', width: 12 }, { header: 'รายการ', key: 'kind', width: 12 },
      { header: 'เงินต้น', key: 'principal', width: 12 }, { header: 'ดอกเบี้ย', key: 'interest', width: 12 }, { header: 'จำนวนวัน', key: 'days', width: 9 },
      { header: 'รับเงิน', key: 'in', width: 12 }, { header: 'จ่ายเงิน', key: 'out', width: 12 }, { header: 'ต้นคงเหลือ', key: 'after', width: 12 },
      { header: 'พนักงาน', key: 'by', width: 16 },
    ];
    const { data } = await range(supabase.from('contract_transactions').select(
      'created_at, kind, principal_amount, interest_amount, interest_days, cash_in, cash_out, principal_after, contract:contracts(contract_no), by:profiles(full_name)',
    ), 'created_at').order('created_at');
    for (const t of data ?? []) {
      ws.addRow({
        at: thTime(t.created_at), no: (t.contract as unknown as { contract_no: string }).contract_no, kind: TX_KIND[t.kind] ?? t.kind,
        principal: Number(t.principal_amount), interest: Number(t.interest_amount), days: t.interest_days, in: Number(t.cash_in), out: Number(t.cash_out),
        after: t.principal_after != null ? Number(t.principal_after) : null, by: (t.by as unknown as { full_name: string } | null)?.full_name,
      });
    }
  } else if (type === 'customers') {
    ws.columns = [
      { header: 'ชื่อ-นามสกุล', key: 'name', width: 26 }, { header: 'เลขบัตร', key: 'nid', width: 16 }, { header: 'โทร', key: 'phone', width: 13 },
      { header: 'ที่อยู่', key: 'addr', width: 40 }, { header: 'บัญชีดำ', key: 'bl', width: 9 }, { header: 'เหตุผล', key: 'reason', width: 24 }, { header: 'เพิ่มเมื่อ', key: 'created', width: 18 },
    ];
    const { data } = await range(supabase.from('customers').select('*'), 'created_at').order('created_at');
    for (const c of data ?? []) {
      ws.addRow({ name: c.full_name, nid: c.national_id, phone: c.phone, addr: c.address, bl: c.is_blacklisted ? 'ใช่' : '', reason: c.blacklist_reason, created: thTime(c.created_at) });
    }
  } else if (type === 'stock') {
    ws.columns = [
      { header: 'ตำแหน่ง', key: 'loc', width: 10 }, { header: 'เลขสัญญา', key: 'no', width: 12 }, { header: 'สินค้า', key: 'item', width: 30 },
      { header: 'สถานะ', key: 'status', width: 16 }, { header: 'เงินต้น', key: 'principal', width: 12 }, { header: 'ครบกำหนด', key: 'due', width: 12 },
    ];
    const { data } = await supabase.from('items').select('name, status, location:locations(code), contract:contracts(contract_no, principal, due_date)').in('status', ['in_storage', 'forfeited']);
    for (const it of data ?? []) {
      const raw = it.contract as unknown as { contract_no: string; principal: number; due_date: string }[] | { contract_no: string; principal: number; due_date: string };
      const c = Array.isArray(raw) ? raw[0] : raw;
      ws.addRow({ loc: (it.location as unknown as { code: string } | null)?.code, no: c?.contract_no, item: it.name, status: ITEM_STATUS[it.status], principal: Number(c?.principal ?? 0), due: d(c?.due_date ?? null) });
    }
  } else {
    return NextResponse.json({ error: 'unknown type' }, { status: 400 });
  }

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E2361' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns.forEach((col) => {
    if (['appraised', 'principal', 'interest', 'in', 'out', 'after'].includes(String(col.key))) col.numFmt = '#,##0.00';
    if (['start', 'due'].includes(String(col.key))) col.numFmt = 'dd/mm/yyyy';
  });

  const buf = await wb.xlsx.writeBuffer();
  const name = `suntorn-${type}-${from ?? 'all'}-${to ?? 'all'}.xlsx`;
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
