import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user!.id).single();
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ color: '#0E2361' }}>สวัสดี {profile?.full_name}</h1>
      <p>สิทธิ์: {profile?.role === 'ceo' ? 'ผู้บริหาร (CEO)' : 'พนักงาน'}</p>
      <Link href="/customers">ลูกค้า</Link>
    </main>
  );
}
