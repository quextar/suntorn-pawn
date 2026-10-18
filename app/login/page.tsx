import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signIn(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) {
    // แยกรหัสผิดออกจากต่อฐานข้อมูลไม่ได้ จะได้รู้สาเหตุจริง
    redirect(`/login?error=${error.status === 400 ? 'credentials' : 'connection'}`);
  }
  redirect('/');
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main style={{ maxWidth: 360, margin: '15vh auto', padding: 24, background: '#fff', borderRadius: 12 }}>
      <h1 style={{ color: '#0E2361', marginTop: 0 }}>สุนทรการค้า</h1>
      <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>อีเมล<input name="email" type="email" required style={{ width: '100%', height: 44, boxSizing: 'border-box' }} /></label>
        <label>รหัสผ่าน<input name="password" type="password" required style={{ width: '100%', height: 44, boxSizing: 'border-box' }} /></label>
        {searchParams.error && (
          <p style={{ color: '#A00D25', margin: 0 }}>
            {searchParams.error === 'credentials'
              ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
              : 'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจค่า Supabase ใน Vercel'}
          </p>
        )}
        <button style={{ height: 44, background: '#0E2361', color: '#fff', border: 0, borderRadius: 8 }}>เข้าสู่ระบบ</button>
      </form>
    </main>
  );
}
