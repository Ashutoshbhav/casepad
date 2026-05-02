'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function startSession(caseId: string) {
  if (!caseId || typeof caseId !== 'string' || caseId.length > 100) {
    throw new Error('caseId (string, ≤100 chars) required');
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Confirm the case exists before opening a session so we don't leave
  // orphan rows on the user's dashboard.
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .maybeSingle();
  if (!caseRow) throw new Error('case not found');

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
