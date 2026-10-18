import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';

async function setBlacklist(formData: FormData) {
  'use server';
  const { supabase, profile } = await requireProfile();
  if (profile.role !== 'ceo') return;
  const id = String(formData.get('id'));
  const on = formData.get('on') === '1';
  await supabase.from('customers').update({
    is_blacklisted: on,
    blacklist_reason: on ? String(formData.get('reason') || '').trim() || null : null,
  }).eq('id', id);
  revalidatePath(`/customers/${id}`);
}

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await requireProfile();
  const { data: c } = await supabase.from('customers').select('*').eq('id', params.id).single();
  if (!c) notFound();
  const photoUrl = c.id_card_photo_path
    ? (await supabase.storage.from('id-cards').createSignedUrl(c.id_card_photo_path, 300)).data?.signedUrl
    : null;
  const isCeo = profile.role === 'ceo';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ color: '#0E2361' }}>{c.full_name}</h1>
      {c.is_blacklisted && (
        <p style={{ background: '#C8102E', color: '#fff', padding: 12, borderRadius: 8 }}>
          บัญชีดำ{c.blacklist_reason ? `: ${c.blacklist_reason}` : ''}
        </p>
      )}
      <p>เลขบัตร {c.national_id} · โทร {c.phone ?? '-'}</p>
      <p>{c.address}</p>
      {photoUrl && <img src={photoUrl} alt="รูปบัตรประชาชน" style={{ maxWidth: '100%', borderRadius: 8 }} />}
      {isCeo && (
        <form action={setBlacklist} style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="on" value={c.is_blacklisted ? '0' : '1'} />
          {!c.is_blacklisted && <input name="reason" placeholder="เหตุผล" style={{ height: 44, flex: 1 }} />}
          <button style={{ height: 44, border: 0, borderRadius: 8, padding: '0 16px', background: c.is_blacklisted ? '#ECEEF2' : '#C8102E', color: c.is_blacklisted ? '#0F1B3D' : '#fff' }}>
            {c.is_blacklisted ? 'นำออกจากบัญชีดำ' : 'เพิ่มเข้าบัญชีดำ'}
          </button>
        </form>
      )}
    </main>
  );
}
