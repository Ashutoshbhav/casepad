import type { SupabaseClient } from '@supabase/supabase-js';
import { completeChat } from '../llm-router';
import { buildEvaluatorMessages } from './evaluator';
import { buildTrackEvaluatorMessages } from './track-evaluator';
import type { Track } from '../tracks';

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

  // Track-aware scoring: prefer session.track, fall back to user's preferred_track.
  // If neither is set, use the legacy generic evaluator for backward compat.
  const track: Track | null = (session.track as Track) || null;
  const cs = (cheatSheet ?? {
    framework: null, hypothesis: null, key_numbers: [],
    decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
  }) as any;

  const messages = track
    ? buildTrackEvaluatorMessages(
        track,
        session.transcript as any,
        (caseRow?.ideal_structure ?? {}) as any,
        cs,
        elapsedSec,
      )
    : buildEvaluatorMessages(
        session.transcript as any,
        (caseRow?.ideal_structure ?? {}) as any,
        cs,
        elapsedSec,
      );

  let raw: string;
  try {
    raw = await completeChat({
      messages: messages as any,
      json: true,
      temperature: 0.2,
      max_tokens: 800,
    });
  } catch (err) {
    return { ok: false, status: 502, body: { error: 'evaluator providers all failed: ' + (err as Error).message } };
  }

  let breakdown: any;
  try {
    breakdown = JSON.parse(raw || '{}');
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
