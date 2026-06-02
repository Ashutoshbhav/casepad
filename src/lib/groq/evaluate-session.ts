import type { SupabaseClient } from '@supabase/supabase-js';
import { completeChat } from '../llm-router';
import { withRetry } from '../supabase/with-retry';
import { buildTrackEvaluatorMessages } from './track-evaluator';
import { staticEvaluatorBreakdown } from './static-fallbacks';
import type { Track } from '../tracks';
import { logFailure } from '../observability/log-failure';
import { validateScore, extractCandidateMathSignals, candidateTurnCount } from '../eval/score-validator';

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
  const { data: session } = await withRetry(() =>
    supabase.from('sessions').select('*').eq('id', sessionId).single()
  );
  if (!session) return { ok: false, status: 404, body: { error: 'session not found' } };

  // P0-8: idempotency. If session is already completed and has a score breakdown,
  // return the existing one instead of re-evaluating. Prevents:
  // - Score volatility from LLM non-determinism on re-runs
  // - Wasted Groq tokens on duplicate evaluations
  // - Race conditions when endSession is called twice (double-click, React Strict Mode)
  if (session.status === 'completed' && session.score_breakdown) {
    return { ok: true, status: 200, body: session.score_breakdown };
  }

  const { data: caseRow } = await withRetry(() =>
    supabase.from('cases').select('ideal_structure').eq('id', session.case_id).single()
  );

  const { data: cheatSheet } = await withRetry(() =>
    supabase.from('cheat_sheets').select('*').eq('session_id', sessionId).maybeSingle()
  );

  const startMs = new Date(session.started_at).getTime();
  const elapsedSec = Math.round((Date.now() - startMs) / 1000);

  // Track-aware scoring. Everything now goes through the per-track rubric — the
  // legacy 3-dim generic evaluator (evaluator.ts) is retired here because it
  // wrote a DIFFERENT shape to the same score_breakdown column, which corrupted
  // weak-spot analytics (audit H2). Null track defaults to consulting.
  const effTrack: Track = (session.track as Track) || 'consulting';
  const cs = (cheatSheet ?? {
    framework: null, hypothesis: null, key_numbers: [],
    decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
  }) as any;

  const messages = buildTrackEvaluatorMessages(
    effTrack,
    session.transcript as any,
    (caseRow?.ideal_structure ?? {}) as any,
    cs,
    elapsedSec,
  );

  let breakdown: any;
  let usedFallback = false;
  try {
    const raw = await completeChat({
      messages: messages as any,
      json: true,
      temperature: 0.2,
      max_tokens: 800,
    });
    try {
      breakdown = JSON.parse(raw || '{}');
    } catch {
      console.warn('[evaluate] LLM output unparseable, using static fallback');
      breakdown = staticEvaluatorBreakdown(effTrack);
      usedFallback = true;
    }
  } catch (err) {
    // All providers failed — degrade gracefully so /debrief still renders.
    console.warn('[evaluate] all LLM providers failed, using static fallback:', (err as Error).message);
    void logFailure('evaluate', err, { sessionId, detail: 'all LLM providers failed during scoring; used static fallback breakdown' });
    breakdown = staticEvaluatorBreakdown(effTrack);
    usedFallback = true;
  }

  // Wave 2 (2026-06-02): validate + finalize the score in CODE. The LLM only
  // PROPOSES per-dimension scores + evidence; we recompute the total, clamp
  // each dimension to its weight, ground the quant dimension in a deterministic
  // candidate-math check, and compute the verdict (reject / pass / strong /
  // insufficient) — instead of trusting the model's self-reported total.
  // The static fallback is a degraded estimate, so we stamp it but skip the
  // strict reject logic (mark insufficient). See src/lib/eval/score-validator.ts.
  let validated: Record<string, unknown>;
  if (usedFallback) {
    validated = {
      ...breakdown,
      track: effTrack,
      scheme: 'track-v2',
      rubric_version: 2,
      fallback_used: true,
      verdict: 'insufficient',
    };
  } else {
    const transcript = session.transcript as { role: string; content: string }[];
    const signals = extractCandidateMathSignals(transcript);
    const tooShort = candidateTurnCount(transcript) < 2;
    validated = validateScore(breakdown, effTrack, signals, tooShort);
  }

  // P0-5 + P0-7: retry the final write. Score persistence is NSM-critical —
  // a transient Supabase 503 between LLM finish and DB write would lose the
  // score and force a re-evaluation (which is non-deterministic and costs
  // tokens). withRetry handles 429/5xx/network with exponential backoff.
  const { error: writeErr } = await withRetry(() =>
    supabase
      .from('sessions')
      .update({
        score: (validated.total as number) ?? 0,
        score_breakdown: validated,
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', sessionId)
  );
  if (writeErr) {
    console.error(`[evaluate] write FAILED after retries for session ${sessionId}: ${JSON.stringify(writeErr).slice(0, 200)}`);
    void logFailure('evaluate', writeErr, { sessionId, detail: 'score persistence failed after retries (score lost, retry-able)' });
    // Return the breakdown anyway so /debrief can render — but mark as not persisted
    // so the user can re-trigger evaluation. The 503 status signals "scoring done,
    // persistence failed — retry-able"; endSession will surface this to the user.
    return { ok: false, status: 503, body: { error: 'persistence failed', breakdown: validated, fallback_used: usedFallback } };
  }

  return { ok: true, status: 200, body: validated };
}
