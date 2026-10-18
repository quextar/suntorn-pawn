import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { SiteHeader } from '@/components/site-header';

export default async function Home() {
  const { profile } = await requireProfile();
  if (profile.role === 'ceo') redirect('/dashboard');
  return (
    <>
      <SiteHeader name={profile.full_name} isCeo={false} />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ color: '#0E2361' }}>สวัสดี {profile.full_name}</h1>
        <p>สิทธิ์: พนักงาน</p>
        <Link href="/customers">ลูกค้า</Link>
      </main>
    </>
  );
}
