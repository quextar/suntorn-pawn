import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('id, branch_id, full_name, role').eq('id', user.id).single();
  if (!profile) redirect('/login');
  return { supabase, profile };
}
