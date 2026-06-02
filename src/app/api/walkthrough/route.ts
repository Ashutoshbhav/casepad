// POST /api/walkthrough — generate (or return cached) the "ideal answer"
// walkthrough for a session's case. Split out of the debrief PAGE render so a
// 60-95s LLM generation never blocks/times-out the page. Called client-side by
// IdealWalkthroughLoader after the page paints.
//
// Returns { walkthrough, cached } — fail-soft to { walkthrough: <stale|null> }
// on any error so the UI degrades instead of crashing.

import { NextRequest, NextResponse } from 'next/server';
import { gateRequest } from '@/lib/api/gate';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateIdealWalkthrough, WALKTHROUGH_GENERATOR_VERSION } from '@/lib/groq/walkthrough';
import { loadDossier } from '@/lib/groq/dossier-context';
import { withRetry } from '@/lib/supabase/with-retry';
import { logFailure } from '@/lib/observability/log-failure';

export const runtime = 'nodejs';
export const maxDuration = 60; // generation can take 30-90s; cap at Vercel's max

export async function POST(req: NextRequest) {
  const gate = await gateRequest({ routeName: 'walkthrough', perUserPerMinute: 12 });
  if (!gate.ok) return gate.response;
  const { user, supabase } = gate;

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const sessionId = body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  // Ownership: the requester must own a session for this case.
  const { data: session } = await withRetry(() =>
    supabase.from('sessions').select('case_id').eq('id', sessionId).eq('user_id', user.id).maybeSingle()
  );
  if (!session?.case_id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: caseRow } = await withRetry(() =>
    supabase
      .from('cases')
      .select('id, title, case_type, problem_statement, interviewer_notes, ideal_structure, ideal_walkthrough')
      .eq('id', session.case_id)
      .single()
  );
  if (!caseRow) return NextResponse.json({ error: 'case not found' }, { status: 404 });

  const cached = caseRow.ideal_walkthrough as any;
  const fresh = !!cached && (cached.generator_version ?? 1) >= WALKTHROUGH_GENERATOR_VERSION;
  if (fresh) return NextResponse.json({ walkthrough: cached, cached: true });

  try {
    const dossier = await loadDossier(caseRow.id);
    const w = await generateIdealWalkthrough(
      caseRow.title,
      caseRow.problem_statement || '',
      caseRow.ideal_structure || {},
      (caseRow.interviewer_notes as any[]) || [],
      { caseType: (caseRow as any).case_type, dossier }
    );
    if (w) {
      // Cache via service role (bypasses RLS for the shared cases row).
      try {
        const admin = createSupabaseAdminClient();
        await withRetry(() => admin.from('cases').update({ ideal_walkthrough: w }).eq('id', caseRow.id));
      } catch (e) {
        console.warn('[walkthrough] cache write failed:', (e as Error).message);
      }
    }
    return NextResponse.json({ walkthrough: w ?? cached ?? null });
  } catch (e) {
    void logFailure('walkthrough', e, { sessionId, userId: user.id, detail: 'ideal walkthrough generation failed' });
    // Fall back to the stale cached one if we have it, else null.
    return NextResponse.json({ walkthrough: cached ?? null, error: true });
  }
}
