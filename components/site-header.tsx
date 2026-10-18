import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLinks, type NavItem } from '@/components/nav-links';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

async function signOut() {
  'use server';
  await createClient().auth.signOut();
  redirect('/login');
}

export function SiteHeader({ name, isCeo, pendingCount = 0 }: { name: string; isCeo: boolean; pendingCount?: number }) {
  const items: NavItem[] = isCeo
    ? [
        { href: '/dashboard', label: 'ภาพรวม', icon: 'dashboard' },
        { href: '/approvals', label: 'อนุมัติ', icon: 'approvals', badge: pendingCount },
        { href: '/pawn/new', label: 'รับจำนำ', icon: 'pawn' },
        { href: '/contracts', label: 'สัญญา', icon: 'contracts' },
        { href: '/customers', label: 'ลูกค้า', icon: 'customers' },
        { href: '/warehouse', label: 'คลัง', icon: 'warehouse' },
        { href: '/scan', label: 'สแกน', icon: 'scan' },
        { href: '/cash', label: 'ปิดยอด', icon: 'cash' },
        { href: '/reports', label: 'รายงาน', icon: 'reports' },
        { href: '/settings', label: 'ตั้งค่า', icon: 'settings' },
      ]
    : [
        { href: '/', label: 'หน้าหลัก', icon: 'home' },
        { href: '/pawn/new', label: 'รับจำนำ', icon: 'pawn' },
        { href: '/contracts', label: 'สัญญา', icon: 'contracts', badge: pendingCount },
        { href: '/customers', label: 'ลูกค้า', icon: 'customers' },
        { href: '/warehouse', label: 'คลัง', icon: 'warehouse' },
        { href: '/scan', label: 'สแกน', icon: 'scan' },
        { href: '/cash', label: 'ปิดยอด', icon: 'cash' },
      ];

  // ผู้บริหารมีเมนูมาก ต้องใช้จอกว้างกว่าจึงจะวางเมนูในแถบเดียวได้
  const wide = isCeo ? 'xl' : 'lg';

  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 font-bold">
          <span className="flex size-8 items-center justify-center rounded-md bg-white text-primary">
            <Store className="size-4" />
          </span>
          <span>สุนทรการค้า</span>
        </Link>
        <nav className={cn('hidden min-w-0 flex-1 items-center gap-0.5', wide === 'xl' ? 'xl:flex' : 'lg:flex')}>
          <NavLinks items={items} />
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm">
          <span className={cn('hidden text-white/80', wide === 'xl' ? '2xl:inline' : 'xl:inline')}>
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
      {/* มือถือ/แท็บเล็ต: เมนูเลื่อนแนวนอน */}
      <nav className={cn('flex gap-0.5 overflow-x-auto border-t border-white/10 px-2 py-1', wide === 'xl' ? 'xl:hidden' : 'lg:hidden')}>
        <NavLinks items={items} />
      </nav>
    </header>
  );
}
