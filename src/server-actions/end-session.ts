'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { evaluateSession } from '@/lib/groq/evaluate-session';

export async function endSession(sessionId: string) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    throw new Error('sessionId (string, ≤100 chars) required');
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');

  // Verify the session belongs to the caller before evaluating it. Without
  // this check any signed-in user could end someone else's session.
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) throw new Error('session not found');

  const result = await evaluateSession(supabase, sessionId);
  if (!result.ok) {
    throw new Error(`evaluate failed (${result.status}): ${JSON.stringify(result.body)}`);
  }
  redirect(`/debrief/${sessionId}`);
}
