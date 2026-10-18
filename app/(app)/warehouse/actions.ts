'use server';

import { requireProfile, requireCeo } from '@/lib/auth';
import { back, str } from '@/lib/actions';

export async function addLocations(f: FormData) {
  const { supabase, profile } = await requireProfile();
  const zone = str(f, 'zone').toUpperCase();
  const shelf = str(f, 'shelf');
  const from = Number(str(f, 'slot_from') || 1);
  const to = Number(str(f, 'slot_to') || from);
  if (!zone || !shelf || !Number.isInteger(from) || !Number.isInteger(to) || to < from || to - from > 50) {
    back('/warehouse', 'error', 'กรอกโซน ชั้น และช่วงช่องให้ถูกต้อง (สูงสุด 50 ช่องต่อครั้ง)');
  }
  const rows = Array.from({ length: to - from + 1 }, (_, i) => ({
    branch_id: profile.branch_id, zone, shelf, slot: String(from + i).padStart(2, '0'), note: str(f, 'note') || null,
  }));
  const { error } = await supabase.from('locations').upsert(rows, { onConflict: 'branch_id,zone,shelf,slot', ignoreDuplicates: true });
  if (error) back('/warehouse', 'error', error.message);
  back('/warehouse', 'ok', `เพิ่มตำแหน่ง ${zone}-${shelf} ช่อง ${from}-${to} แล้ว`);
}

export async function deleteLocation(f: FormData) {
  const { supabase } = await requireCeo();
  const id = str(f, 'id');
  const { count } = await supabase.from('items').select('id', { count: 'exact', head: true }).eq('location_id', id);
  if (count) back(`/warehouse/${id}`, 'error', 'ยังมีของอยู่ในช่องนี้ ย้ายออกก่อน');
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) back(`/warehouse/${id}`, 'error', 'ลบไม่ได้ เพราะมีประวัติการย้ายของผูกอยู่');
  back('/warehouse', 'ok', 'ลบตำแหน่งแล้ว');
}

export async function placeItem(f: FormData) {
  const { supabase } = await requireProfile();
  const returnTo = str(f, 'return_to') || '/warehouse';
  const { error } = await supabase.rpc('move_item', { p_item: str(f, 'item_id'), p_location: str(f, 'location_id') || null, p_note: null });
  if (error) back(returnTo, 'error', error.message);
  back(returnTo, 'ok', 'บันทึกตำแหน่งแล้ว');
}

export async function startCount() {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc('start_stock_count');
  if (error) back('/warehouse/count', 'error', error.message);
  back(`/warehouse/count/${data}`, 'ok', 'เริ่มรอบตรวจนับแล้ว สแกนสติกเกอร์สินค้าทีละชิ้น');
}

export async function closeCount(f: FormData) {
  const { supabase } = await requireProfile();
  const id = str(f, 'id');
  const { error } = await supabase.rpc('close_stock_count', { p_count: id, p_note: str(f, 'note') });
  if (error) back(`/warehouse/count/${id}`, 'error', error.message);
  back(`/warehouse/count/${id}`, 'ok', 'ปิดรอบตรวจนับแล้ว');
}

// เรียกจากหน้าสแกน ตอบกลับเป็นข้อความ ไม่เปลี่ยนหน้า
export async function scanCountItem(countId: string, itemId: string, locationId: string | null) {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc('scan_stock_item', { p_count: countId, p_item: itemId, p_location: locationId });
  if (error) return { ok: false, message: error.message };
  const { data: item } = await supabase.from('items').select('name, contract:contracts(contract_no)').eq('id', itemId).single();
  const c = item?.contract as unknown as { contract_no: string }[] | { contract_no: string } | null;
  const no = Array.isArray(c) ? c[0]?.contract_no : c?.contract_no;
  return { ok: data === 'ok', message: data === 'ok' ? 'พบสินค้า' : String(data), name: `${no ?? ''} ${item?.name ?? ''}`.trim() };
}
