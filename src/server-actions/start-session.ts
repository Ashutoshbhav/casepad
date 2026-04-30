'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function startSession(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, case_id: caseId, transcript: [] })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'failed to start session');

  await supabase.from('cheat_sheets').insert({ session_id: data.id });
  redirect(`/solve/${caseId}?session=${data.id}`);
}
