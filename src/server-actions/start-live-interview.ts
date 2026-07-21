'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateOpener } from '@/lib/groq/opener';
import { withRetry } from '@/lib/supabase/with-retry';

// Sibling to server-actions/start-session.ts, not a modification of it —
// /solve's start flow stays untouched. This file starts a session for the
// NEW live-interview surface instead, either from an existing case or
// caseless (behavioral/culture-fit), and redirects to /live-interview/[id]
// rather than /solve/[caseId].

function behavioralOpener(hasResume: boolean, targetFirm: string | null): string {
  const firmLine = targetFirm ? ` for ${targetFirm}` : '';
  const resumeLine = hasResume
    ? ' I have your résumé in front of me, so I may ask about specifics from it.'
    : '';
  return `Hi, I'm Ash. This is the behavioral / fit round${firmLine} — real situations you've actually been in, not hypotheticals.${resumeLine} Let's start simple: walk me through your background in a couple of minutes.`;
}

/** Start a live (voice-first) interview on an EXISTING case. */
export async function startLiveCaseInterview(caseId: string) {
  if (!caseId || typeof caseId !== 'string' || caseId.length > 100) {
    throw new Error('caseId (string, ≤100 chars) required');
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, problem_statement')
    .eq('id', caseId)
    .maybeSingle();
  if (!caseRow) throw new Error('case not found');

  const track = user.user_metadata?.preferred_track || 'consulting';

  // Same fortress-backed opener generator as /solve — never throws, falls
  // through its own multi-layer fallback to a static line.
  const opener = await generateOpener({
    caseTitle: caseRow.title,
    problemStatement: caseRow.problem_statement,
    priorSession: null,
    track,
  });
  const openerTurn = {
    role: 'interviewer' as const,
    content: opener,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await withRetry(() =>
    supabase
      .from('sessions')
      .insert({ user_id: user.id, case_id: caseId, transcript: [openerTurn], track })
      .select('id')
      .single()
  );
  if (error || !data) throw new Error(error?.message || 'failed to start live interview');

  redirect(`/live-interview/${data.id}`);
}

/** Start a live (voice-first) CASELESS interview — behavioral / culture-fit. */
export async function startCaselessLiveInterview(targetFirm: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  let hasResume = false;
  try {
    const { data: resumeRow } = await supabase
      .from('user_resumes')
      .select('resume_text')
      .eq('user_id', user.id)
      .maybeSingle();
    hasResume = !!resumeRow?.resume_text;
  } catch (e) {
    console.warn('[start-live-interview] resume lookup failed (non-blocking):', e);
  }

  const safeTargetFirm =
    typeof targetFirm === 'string' && targetFirm.trim().length > 0
      ? targetFirm.trim().slice(0, 120)
      : null;

  // Deterministic opener — no LLM call for the very first line. Same
  // principle as the fortress's static fallbacks: fewer dependencies on the
  // turn that starts the whole session is strictly more reliable, and a
  // canned, well-written opener doesn't need LLM creativity to land well.
  const openerTurn = {
    role: 'interviewer' as const,
    content: behavioralOpener(hasResume, safeTargetFirm),
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await withRetry(() =>
    supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        case_id: null,
        track: 'behavioral',
        target_firm: safeTargetFirm,
        transcript: [openerTurn],
      })
      .select('id')
      .single()
  );
  if (error || !data) throw new Error(error?.message || 'failed to start live interview');

  redirect(`/live-interview/${data.id}`);
}
