import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Profile = { id: string; branch_id: string; full_name: string; role: 'ceo' | 'staff' };

export async function requireProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('id, branch_id, full_name, role').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');
  return { supabase, profile };
}

export async function requireCeo() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== 'ceo') redirect('/');
  return ctx;
}
