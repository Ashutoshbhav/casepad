'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateOpener } from '@/lib/groq/opener';

// Last-resort affordance for stuck/corrupt sessions: nulls the transcript,
// issue_tree, and resets to in_progress so the user can start the chat
// fresh on the same session row. Preserves the case_id + session_id so the
// dashboard "resume" pill still works pointing here.
//
// Why not just delete & re-create? Because the URL has the session id; if
// we delete the row the page 404s. This way the URL stays valid.
//
// Reset also re-seeds the interviewer's opening turn so the user doesn't
// end up at the same blank-box starting point we just engineered away.
export async function resetSession(sessionId: string) {
  if (!sessionId || typeof sessionId !== 'string') return;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Confirm ownership before reset (prevents abuse via crafted form posts).
  const { data: session } = await supabase
    .from('sessions')
    .select('id, user_id, case_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) redirect('/cases');

  // Re-fetch case content for a fresh opener. Same projection as startSession —
  // never select ideal_structure or interviewer_notes here.
  const { data: caseRow } = await supabase
    .from('cases')
    .select('title, problem_statement')
    .eq('id', session.case_id)
    .maybeSingle();

  // Build the seed transcript. If the case row vanished mid-reset (extremely
  // unlikely — cascade delete would have wiped the session too), fall back to
  // an empty transcript instead of failing the reset.
  const seedTranscript = caseRow
    ? [
        {
          role: 'interviewer' as const,
          content: await generateOpener({
            caseTitle: caseRow.title,
            problemStatement: caseRow.problem_statement,
          }),
          timestamp: new Date().toISOString(),
        },
      ]
    : [];

  await supabase
    .from('sessions')
    .update({
      transcript: seedTranscript,
      issue_tree: null,
      score: null,
      score_breakdown: null,
      ended_at: null,
      status: 'in_progress',
    })
    .eq('id', sessionId);

  // Also clear the cheat sheet so it re-fills from scratch.
  await supabase.from('cheat_sheets').delete().eq('session_id', sessionId);

  redirect(`/solve/${session.case_id}?session=${sessionId}`);
}
