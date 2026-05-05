'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateOpener } from '@/lib/groq/opener';

export async function startSession(caseId: string) {
  if (!caseId || typeof caseId !== 'string' || caseId.length > 100) {
    throw new Error('caseId (string, ≤100 chars) required');
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // Pull title + problem_statement up front so we can seed the interviewer's
  // opening turn before the user lands on /solve. We deliberately do NOT
  // select ideal_structure or interviewer_notes here — leaking those into the
  // opener prompt would give away the answer key.
  //
  // In parallel, fetch the user's most recent COMPLETED session so the opener
  // can reference continuity ("last time we did profitability — today..."). We
  // pass at most a one-line summary into the LLM; never the transcript or score
  // breakdown details. If the last session ended <2 hours ago we suppress the
  // continuity hint — back-to-back reps don't need a "last time" callback.
  const [caseRowResult, priorResult] = await Promise.all([
    supabase
      .from('cases')
      .select('id, title, problem_statement')
      .eq('id', caseId)
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('case_id, score, score_breakdown, ended_at, cases(title, case_type)')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const caseRow = caseRowResult.data;
  if (!caseRow) throw new Error('case not found');

  // Build the optional continuity hint. We treat anything within the last
  // 2 hours as "still in the same session block" — Ash shouldn't say "last
  // time we did X" when X was 2 minutes ago.
  let priorSession: Parameters<typeof generateOpener>[0]['priorSession'] = null;
  const priorRow = (priorResult.data ?? null) as
    | {
        case_id: string;
        score: number | null;
        score_breakdown: unknown;
        ended_at: string | null;
        cases: { title: string; case_type: string } | null;
      }
    | null;
  if (priorRow && priorRow.cases && priorRow.ended_at) {
    const endedAtMs = new Date(priorRow.ended_at).getTime();
    const ageMs = Date.now() - endedAtMs;
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    if (ageMs >= TWO_HOURS_MS) {
      // Pull the lowest-scoring rubric dim if breakdown exists. Best-effort —
      // wrong shape is fine; we just skip the dimension hint.
      let weakDimension: string | null = null;
      const b = priorRow.score_breakdown as Record<string, unknown> | null;
      if (b && typeof b === 'object') {
        const dimEntries = Object.entries(b)
          .filter(([k, v]) => typeof v === 'number' && ['structure', 'insight', 'speed'].includes(k))
          .map(([k, v]) => [k, v as number] as const);
        if (dimEntries.length > 0) {
          // Normalize to /100 by dividing by max for that dim.
          const maxByDim: Record<string, number> = { structure: 40, insight: 40, speed: 20 };
          const normalized = dimEntries.map(([k, v]) => [k, v / (maxByDim[k] ?? 1)] as const);
          normalized.sort((a, b) => a[1] - b[1]);
          weakDimension = normalized[0][0];
        }
      }
      priorSession = {
        caseTitle: priorRow.cases.title,
        caseType: priorRow.cases.case_type,
        score: priorRow.score ?? 0,
        weakDimension,
      };
    }
  }

  // Generate the interviewer's first turn BEFORE inserting the session row,
  // so the row is created with a populated transcript. generateOpener has its
  // own multi-layer fallback (Groq 8b → 4-layer fortress → static), so it
  // will never throw — session creation is never blocked by AI being down.
  const opener = await generateOpener({
    caseTitle: caseRow.title,
    problemStatement: caseRow.problem_statement,
    priorSession,
  });
  const openerTurn = {
    role: 'interviewer' as const,
    content: opener,
    timestamp: new Date().toISOString(),
  };

  // Tag the session with the user's preferred track so the track-aware
  // evaluator scores it on the right rubric.
  const track = user.user_metadata?.preferred_track || 'consulting';
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      case_id: caseId,
      transcript: [openerTurn],
      track,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'failed to start session');

  await supabase.from('cheat_sheets').insert({ session_id: data.id });
  redirect(`/solve/${caseId}?session=${data.id}`);
}
