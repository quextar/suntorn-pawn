'use server';

import { requireProfile } from '@/lib/auth';
import { back, num, str } from '@/lib/actions';

// ทุกปุ่มในหน้าสัญญาเรียกฟังก์ชันในฐานข้อมูล ซึ่งตรวจสิทธิ์และคำนวณเงินเอง
async function run(formData: FormData, fn: string, args: Record<string, unknown>, okText: string) {
  const { supabase } = await requireProfile();
  const id = str(formData, 'id');
  const returnTo = str(formData, 'return_to') || `/contracts/${id}`;
  const { error } = await supabase.rpc(fn, args);
  if (error) back(returnTo, 'error', error.message);
  back(returnTo, 'ok', okText);
}

export async function approve(f: FormData) {
  await run(f, 'decide_contract', { p_id: str(f, 'id'), p_approve: true, p_principal: num(f, 'principal'), p_note: str(f, 'note') },
    'อนุมัติแล้ว จ่ายเงินลูกค้าและพิมพ์ตั๋วได้เลย');
}
export async function reject(f: FormData) {
  await run(f, 'decide_contract', { p_id: str(f, 'id'), p_approve: false, p_principal: null, p_note: str(f, 'note') }, 'ไม่อนุมัติสัญญานี้แล้ว');
}
export async function renew(f: FormData) {
  await run(f, 'renew_contract', { p_id: str(f, 'id') }, 'ต่อดอกแล้ว');
}
export async function fee(f: FormData) {
  await run(f, 'add_fee', { p_id: str(f, 'id'), p_amount: num(f, 'amount'), p_note: str(f, 'note') }, 'รับค่าดำเนินการแล้ว');
}
export async function addPrincipal(f: FormData) {
  await run(f, 'add_principal', { p_id: str(f, 'id'), p_amount: num(f, 'amount') }, 'เพิ่มเงินต้นแล้ว');
}
export async function redeem(f: FormData) {
  await run(f, 'redeem_contract', { p_id: str(f, 'id') }, 'ไถ่ถอนแล้ว คืนสินค้าให้ลูกค้าได้');
}
export async function forfeit(f: FormData) {
  await run(f, 'forfeit_contract', { p_id: str(f, 'id') }, 'บันทึกหลุดจำนำแล้ว สินค้าเปลี่ยนเป็นรอขาย');
}
export async function cancel(f: FormData) {
  await run(f, 'cancel_contract', { p_id: str(f, 'id'), p_reason: str(f, 'reason') }, 'ยกเลิกสัญญาแล้ว');
}
export async function moveItem(f: FormData) {
  await run(f, 'move_item', { p_item: str(f, 'item_id'), p_location: str(f, 'location_id') || null, p_note: str(f, 'note') }, 'บันทึกตำแหน่งแล้ว');
}
