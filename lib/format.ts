const TZ = 'Asia/Bangkok';

export const baht = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(Number(n ?? 0));

export const thDate = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(d)) : '–';

export const thDateLong = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)) : '–';

export const thDateTime = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '–';

// วันที่วันนี้ตามเวลาไทยแบบ YYYY-MM-DD
export const todayTH = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86400000);

export const maskId = (id: string) => (id.length === 13 ? `${id.slice(0, 1)}-xxxx-xxxxx-${id.slice(10, 12)}-${id.slice(12)}` : id);

export const CONTRACT_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'รออนุมัติ', className: 'bg-amber-100 text-amber-800' },
  rejected: { label: 'ไม่อนุมัติ', className: 'bg-zinc-200 text-zinc-700' },
  active: { label: 'ดำเนินอยู่', className: 'bg-primary/10 text-primary' },
  redeemed: { label: 'ไถ่ถอนแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  forfeited: { label: 'หลุดจำนำ', className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'ยกเลิก', className: 'bg-zinc-200 text-zinc-700' },
};

export const ITEM_STATUS: Record<string, string> = {
  pending: 'รออนุมัติ',
  rejected: 'ไม่อนุมัติ',
  in_storage: 'อยู่ในคลัง',
  redeemed: 'คืนลูกค้าแล้ว',
  forfeited: 'หลุดจำนำ รอขาย',
  cancelled: 'ยกเลิก',
};

export const TX_KIND: Record<string, string> = {
  loan: 'จ่ายเงินกู้',
  interest: 'ต่อดอก',
  reduce: 'ลดต้น',
  add: 'เพิ่มต้น',
  redeem: 'ไถ่ถอน',
  forfeit: 'หลุดจำนำ',
  cancel: 'ยกเลิก',
};

// ข้อความ error จาก Supabase ให้อ่านง่าย
export const errorText = (msg: string | undefined | null) => (msg ?? 'เกิดข้อผิดพลาด').replace(/^.*?:\s(?=[ก-๙])/, '');
