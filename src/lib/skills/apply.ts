// src/lib/skills/apply.ts
//
// Glue for the per-skill learner model (PRD v3.1 Stage 1). Called
// fire-and-forget from evaluateSession AFTER the score is persisted:
//
//   traceAndApplySkills(supabase, session)
//     -> LLM knowledge-tracing pass over the transcript   (aux tier)
//     -> map each observation to a Glicko-2 match
//     -> upsert skill_obs, recompute skill_state
//
// FORTRESS RULE: this must never throw into or slow the NSM. It is best-effort
// like logFailure — every failure is swallowed to logFailure('evaluate', ...).
// Wire it as `void traceAndApplySkills(...)`, never awaited on the hot path.

import type { SupabaseClient } from '@supabase/supabase-js';
import { completeChat } from '../llm-router';
import { rate, type Rating, type Match, DEFAULT_RATING } from './glicko2';
import {
  buildTracingMessages,
  parseTracingResponse,
  type SkillObservation,
  type TranscriptTurn,
} from './knowledge-tracing';
import { SKILLS, SKILL_GROUPS, getSkill, type SkillGroup } from './taxonomy';

interface SessionRow {
  id: string;
  user_id: string;
  case_id: string | null;
  transcript: unknown;
}

// difficulty 0..1 -> Glicko opponent rating. 0 = easy (1200), 1 = hard (1800).
function opponentRating(difficulty: number): number {
  return 1200 + 600 * difficulty;
}
// low tracer confidence -> a less informative match (wider opponent RD).
function opponentRd(confidence: number): number {
  return 100 + (1 - confidence) * 150; // conf 1 -> 100, conf 0 -> 250
}

export function observationToMatch(o: SkillObservation): Match {
  return {
    opponentRating: opponentRating(o.difficulty),
    opponentRd: opponentRd(o.confidence),
    score: o.quality,
  };
}

/** Which observations carry a real rating signal. */
export function usableObservation(o: SkillObservation): boolean {
  return o.demonstrated && o.confidence >= 0.25;
}

/**
 * Run the tracing pass + apply it. Best-effort; returns the number of skills
 * updated (0 on any failure). Never throws.
 */
export async function traceAndApplySkills(
  supabase: SupabaseClient,
  session: SessionRow,
): Promise<number> {
  try {
    const transcript = Array.isArray(session.transcript)
      ? (session.transcript as TranscriptTurn[])
      : [];
    if (transcript.length < 3) return 0; // nothing meaningful to trace

    // Already traced (defensive — evaluateSession's own idempotency guard
    // normally means we only get here once per session).
    const { data: existing } = await supabase
      .from('skill_obs')
      .select('id')
      .eq('session_id', session.id)
      .limit(1);
    if (existing && existing.length > 0) return 0;

    let caseTitle: string | null = null;
    let caseType: string | null = null;
    if (session.case_id) {
      const { data: c } = await supabase
        .from('cases')
        .select('title, case_type')
        .eq('id', session.case_id)
        .maybeSingle();
      caseTitle = c?.title ?? null;
      caseType = c?.case_type ?? null;
    }

    const raw = await completeChat({
      tier: 'aux',
      messages: buildTracingMessages({ transcript, caseTitle, caseType }),
      max_tokens: 2000,
      temperature: 0,
      json: true,
    });
    const observations = parseTracingResponse(raw).filter(usableObservation);
    if (observations.length === 0) return 0;

    await applyObservations(supabase, session.user_id, session.id, observations);
    return observations.length;
  } catch (err) {
    // Lazy import: log-failure is `server-only`; keeping it out of this
    // module's static graph lets the pure logic here be unit-tested.
    try {
      const { logFailure } = await import('../observability/log-failure');
      void logFailure('evaluate', err, {
        sessionId: session.id,
        detail: 'skill knowledge-tracing failed (best-effort, score unaffected)',
      });
    } catch {
      console.error('[skills] tracing failed:', err instanceof Error ? err.message : err);
    }
    return 0;
  }
}

/**
 * Upsert skill_obs and roll each observation into skill_state via Glicko-2.
 * One session = one rating period per skill.
 */
export async function applyObservations(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  observations: SkillObservation[],
): Promise<void> {
  const skillIds = observations.map((o) => o.skillId);

  const { data: stateRows } = await supabase
    .from('skill_state')
    .select('skill_id, rating, rd, vol, obs_count')
    .eq('user_id', userId)
    .in('skill_id', skillIds);

  const stateBySkill = new Map<string, { rating: number; rd: number; vol: number; obs_count: number }>(
    (stateRows ?? []).map((r) => [r.skill_id as string, r as any]),
  );

  const now = new Date().toISOString();
  const obsRows = observations.map((o) => ({
    user_id: userId,
    session_id: sessionId,
    skill_id: o.skillId,
    demonstrated: o.demonstrated,
    quality: o.quality,
    difficulty: o.difficulty,
    confidence: o.confidence,
    evidence: o.evidence,
    created_at: now,
  }));
  const stateUpserts = observations.map((o) => {
    const prev = stateBySkill.get(o.skillId);
    const current: Rating = prev
      ? { rating: prev.rating, rd: prev.rd, vol: prev.vol }
      : { ...DEFAULT_RATING };
    const next = rate(current, [observationToMatch(o)]);
    return {
      user_id: userId,
      skill_id: o.skillId,
      rating: next.rating,
      rd: next.rd,
      vol: next.vol,
      obs_count: (prev?.obs_count ?? 0) + 1,
      last_obs_at: now,
      updated_at: now,
    };
  });

  await supabase.from('skill_obs').upsert(obsRows, { onConflict: 'session_id,skill_id' });
  await supabase.from('skill_state').upsert(stateUpserts, { onConflict: 'user_id,skill_id' });
}

// ---- read side (debrief UI) ----

export interface SkillProfileEntry {
  skillId: string;
  name: string;
  group: SkillGroup;
  rating: number;
  rd: number;
  /** rating - rd: conservative "how good are they, really" for ranking. */
  estimate: number;
  obsCount: number;
  /** true until there's enough evidence to trust the number. */
  provisional: boolean;
}

export interface SkillProfile {
  entries: SkillProfileEntry[];
  byGroup: Record<SkillGroup, SkillProfileEntry[]>;
  weakest: SkillProfileEntry[];
  strongest: SkillProfileEntry[];
  totalObservations: number;
}

const PROVISIONAL_RD = 150; // above this, don't present the number as settled

export async function getSkillProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<SkillProfile> {
  const { data: rows } = await supabase
    .from('skill_state')
    .select('skill_id, rating, rd, obs_count')
    .eq('user_id', userId);

  const stateBySkill = new Map<string, any>((rows ?? []).map((r) => [r.skill_id, r]));

  const entries: SkillProfileEntry[] = SKILLS.map((s) => {
    const st = stateBySkill.get(s.id);
    const rating = st?.rating ?? DEFAULT_RATING.rating;
    const rd = st?.rd ?? DEFAULT_RATING.rd;
    const obsCount = st?.obs_count ?? 0;
    return {
      skillId: s.id,
      name: s.name,
      group: s.group,
      rating: Math.round(rating),
      rd: Math.round(rd),
      estimate: Math.round(rating - rd),
      obsCount,
      provisional: obsCount === 0 || rd > PROVISIONAL_RD,
    };
  });

  const byGroup = {} as Record<SkillGroup, SkillProfileEntry[]>;
  for (const g of Object.keys(SKILL_GROUPS) as SkillGroup[]) byGroup[g] = [];
  for (const e of entries) byGroup[e.group].push(e);

  const rated = entries.filter((e) => e.obsCount > 0);
  const byEstimate = [...rated].sort((a, b) => a.estimate - b.estimate);

  return {
    entries,
    byGroup,
    weakest: byEstimate.slice(0, 5),
    strongest: byEstimate.slice(-5).reverse(),
    totalObservations: rated.reduce((n, e) => n + e.obsCount, 0),
  };
}

export { getSkill };
