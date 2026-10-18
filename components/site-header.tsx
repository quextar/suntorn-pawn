import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutDashboard, LogOut, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  await createClient().auth.signOut();
  redirect('/login');
}

export function SiteHeader({ name, isCeo }: { name: string; isCeo: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold">
          <span className="flex size-8 items-center justify-center rounded-md bg-white text-primary">
            <Store className="size-4" />
          </span>
          <span className="hidden sm:inline">สุนทรการค้า</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {isCeo && (
            <Link href="/dashboard" className="flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-white/10">
              <LayoutDashboard className="size-4" /> ภาพรวม
            </Link>
          )}
          <Link href="/customers" className="flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-white/10">
            <Users className="size-4" /> ลูกค้า
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden text-white/80 md:inline">
            {name} · {isCeo ? 'ผู้บริหาร' : 'พนักงาน'}
          </span>
          <form action={signOut}>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">ออกจากระบบ</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
