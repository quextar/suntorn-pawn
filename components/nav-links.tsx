'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck, Boxes, FileSpreadsheet, FileText, Home, LayoutDashboard, PackagePlus, ScanLine, Settings, Users, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  home: Home, dashboard: LayoutDashboard, approvals: BadgeCheck, pawn: PackagePlus, contracts: FileText,
  customers: Users, warehouse: Boxes, scan: ScanLine, cash: Wallet, reports: FileSpreadsheet, settings: Settings,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <>
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white',
              active && 'bg-white/15 text-white',
            )}
          >
            <Icon className="size-4" />
            {it.label}
            {!!it.badge && (
              <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-white">{it.badge}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}
