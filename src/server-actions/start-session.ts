'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function startSession(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Tag the session with the user's preferred track so the track-aware
  // evaluator scores it on the right rubric.
  const track = user.user_metadata?.preferred_track || 'consulting';
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, case_id: caseId, transcript: [], track })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'failed to start session');

  await supabase.from('cheat_sheets').insert({ session_id: data.id });
  redirect(`/solve/${caseId}?session=${data.id}`);
}
