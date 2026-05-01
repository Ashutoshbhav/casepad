import type { SupabaseClient } from '@supabase/supabase-js';
import { groq, MODEL_LARGE } from './client';
import { buildEvaluatorMessages } from './evaluator';

export interface EvaluateResult {
  ok: boolean;
  status: number;
  body: any;
}

// Evaluates a session and writes the breakdown to the sessions row.
// Reusable from both /api/evaluate and the endSession server action,
// avoiding the cookie-loss bug when server actions fetch their own API routes.
export async function evaluateSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<EvaluateResult> {
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (!session) return { ok: false, status: 404, body: { error: 'session not found' } };

  const { data: caseRow } = await supabase
    .from('cases')
    .select('ideal_structure')
    .eq('id', session.case_id)
    .single();

  const { data: cheatSheet } = await supabase
    .from('cheat_sheets')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  const startMs = new Date(session.started_at).getTime();
  const elapsedSec = Math.round((Date.now() - startMs) / 1000);

  const messages = buildEvaluatorMessages(
    session.transcript as any,
    (caseRow?.ideal_structure ?? {}) as any,
    (cheatSheet ?? {
      framework: null, hypothesis: null, key_numbers: [],
      decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
    }) as any,
    elapsedSec
  );

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  });

  let breakdown: any;
  try {
    breakdown = JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return { ok: false, status: 502, body: { error: 'invalid evaluator output' } };
  }

  await supabase
    .from('sessions')
    .update({
      score: breakdown.total ?? 0,
      score_breakdown: breakdown,
      ended_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', sessionId);

  return { ok: true, status: 200, body: breakdown };
}
