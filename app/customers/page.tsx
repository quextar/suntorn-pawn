import { createClient } from '@/lib/supabase/server';

export default async function Customers({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  let query = supabase.from('customers').select('id, full_name, phone, is_blacklisted').order('created_at', { ascending: false }).limit(100);
  const q = searchParams.q?.trim();
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[,%()]/g, '')}%,phone.ilike.%${q.replace(/[,%()]/g, '')}%`);
  const { data: rows } = await query;
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ color: '#0E2361' }}>ลูกค้า</h1>
      <form><input name="q" defaultValue={q} placeholder="ชื่อหรือเบอร์โทร" style={{ height: 44, width: 280 }} /></form>
      <ul>
        {rows?.map((c) => (
          <li key={c.id}>
            {c.full_name} {c.phone} {c.is_blacklisted && <strong style={{ color: '#C8102E' }}>บัญชีดำ</strong>}
          </li>
        ))}
      </ul>
    </main>
  );
}
