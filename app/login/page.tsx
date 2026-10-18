import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/confirm-button';
import { BorderBeam } from '@/components/ui/border-beam';

async function signIn(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')).trim(),
    password: String(formData.get('password')),
  });
  if (error) {
    // แยกรหัสผิดออกจากต่อฐานข้อมูลไม่ได้ จะได้รู้สาเหตุจริง
    if (error.status === 400) redirect('/login?error=credentials');
    redirect(`/login?error=connection&detail=${encodeURIComponent(error.message)}`);
  }
  redirect('/');
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string; detail?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/15 to-background px-4">
      <Card className="relative w-full max-w-sm overflow-hidden shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-white"><Store className="size-6" /></span>
            <h1 className="m-0 text-2xl font-bold text-primary">สุนทรการค้า</h1>
            <p className="text-sm text-muted-foreground">ระบบหลังร้าน</p>
          </div>
          <form action={signIn} className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="email">อีเมล</Label><Input id="email" name="email" type="email" required autoComplete="username" className="h-11" /></div>
            <div className="grid gap-1.5"><Label htmlFor="password">รหัสผ่าน</Label><Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11" /></div>
            {searchParams.error && (
              <p className="m-0 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {searchParams.error === 'credentials'
                  ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
                  : `เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจค่า Supabase ใน Vercel (${searchParams.detail ?? ''})`}
              </p>
            )}
            <SubmitButton size="lg">เข้าสู่ระบบ</SubmitButton>
          </form>
        </CardContent>
        <BorderBeam size={120} duration={9} colorFrom="#0E2361" colorTo="#C8102E" />
      </Card>
    </main>
  );
}
