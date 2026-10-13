import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CurriculumNode } from '@/types';

/** Signed-in user plus Supabase client, or a redirect to login. */
export async function requireUser() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
  return { supabase, shellUser: { name: profile?.name ?? user.user_metadata?.full_name ?? null, email: user.email ?? null } };
}

export type GraphRow = { id: string; topic: string; nodes_json: CurriculumNode[] | null };
