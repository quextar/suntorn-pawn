import type { ReactNode } from 'react';
import { requireProfile } from '@/lib/auth';
import { SiteHeader } from '@/components/site-header';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { supabase, profile } = await requireProfile();
  const { count } = await supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  return (
    <>
      <SiteHeader name={profile.full_name} isCeo={profile.role === 'ceo'} pendingCount={count ?? 0} />
      {children}
    </>
  );
}
