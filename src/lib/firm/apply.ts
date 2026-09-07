// src/lib/firm/apply.ts
//
// "The Firm" DB glue (PRD v3.1 Stage 3). Two entry points:
//   bumpEngagement()  — fire-and-forget after a session is scored: +1
//                       engagement, and AUTO-PROMOTE if the criteria are met
//                       (returns { promoted, newTitle } so the debrief can
//                       celebrate). Fortress-safe: never throws, never blocks.
//   getFirmView()     — read model for the /firm page + the debrief strip.
//
// Not server-only: read from server components + the post-session hook.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSkillProfile } from '@/lib/skills/apply';
import { levelAt, TOP_LEVEL_INDEX } from './levels';
import {
  computeFirmState,
  type FirmProfileRow,
  type FirmState,
  type SkillBandCounts,
} from './progression';

const DEFAULT_ROW: FirmProfileRow = {
  level: 0,
  engagements_completed: 0,
  engagements_at_level: 0,
};

async function readProfile(supabase: SupabaseClient, userId: string): Promise<FirmProfileRow> {
  const { data } = await supabase
    .from('firm_profile')
    .select('level, engagements_completed, engagements_at_level, joined_at, last_promo_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data
    ? {
        level: data.level ?? 0,
        engagements_completed: data.engagements_completed ?? 0,
        engagements_at_level: data.engagements_at_level ?? 0,
        joined_at: data.joined_at ?? null,
        last_promo_at: data.last_promo_at ?? null,
      }
    : { ...DEFAULT_ROW };
}

/** Recent session scores for this user, newest first — used for the rolling
 *  average. We can't cheaply tie a score to "the level it was earned at", so
 *  v0 uses the most recent `limit` completed scores overall. */
async function recentScores(supabase: SupabaseClient, userId: string, limit = 12): Promise<number[]> {
  const { data } = await supabase
    .from('sessions')
    .select('score, ended_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('score', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => Number(r.score) || 0);
}

async function skillBands(supabase: SupabaseClient, userId: string): Promise<SkillBandCounts> {
  try {
    const p = await getSkillProfile(supabase, userId);
    let solid = 0;
    let strong = 0;
    for (const e of p.entries) {
      if (e.obsCount === 0) continue;
      if (e.estimate >= 1650) {
        strong += 1;
        solid += 1;
      } else if (e.estimate >= 1500) {
        solid += 1;
      }
    }
    return { solid, strong };
  } catch {
    return { solid: 0, strong: 0 };
  }
}

export interface BumpResult {
  ok: boolean;
  promoted: boolean;
  newTitle?: string;
  level: number;
}

export async function bumpEngagement(
  supabase: SupabaseClient,
  userId: string,
): Promise<BumpResult> {
  try {
    const prev = await readProfile(supabase, userId);
    const engagementsCompleted = prev.engagements_completed + 1;
    let engagementsAtLevel = prev.engagements_at_level + 1;
    let level = prev.level;
    const now = new Date().toISOString();
    let promoted = false;

    // Recompute state with the incremented counts to check promotion.
    const [scores, bands] = await Promise.all([
      recentScores(supabase, userId),
      skillBands(supabase, userId),
    ]);
    const state = computeFirmState(
      { ...prev, engagements_completed: engagementsCompleted, engagements_at_level: engagementsAtLevel },
      scores,
      bands,
    );
    if (state.promoEligible && level < TOP_LEVEL_INDEX) {
      level += 1;
      engagementsAtLevel = 0;
      promoted = true;
    }

    const { error } = await supabase.from('firm_profile').upsert(
      {
        user_id: userId,
        level,
        engagements_completed: engagementsCompleted,
        engagements_at_level: engagementsAtLevel,
        ...(promoted ? { last_promo_at: now } : {}),
        updated_at: now,
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;

    return { ok: true, promoted, newTitle: promoted ? levelAt(level).title : undefined, level };
  } catch (err) {
    try {
      const { logFailure } = await import('@/lib/observability/log-failure');
      void logFailure('evaluate', err, { userId, detail: 'firm engagement bump failed (best-effort)' });
    } catch {
      console.error('[firm] bump failed:', err instanceof Error ? err.message : err);
    }
    return { ok: false, promoted: false, level: 0 };
  }
}

export interface FirmView extends FirmState {
  recentScores: number[];
}

export async function getFirmView(supabase: SupabaseClient, userId: string): Promise<FirmView> {
  const [profile, scores, bands] = await Promise.all([
    readProfile(supabase, userId),
    recentScores(supabase, userId),
    skillBands(supabase, userId),
  ]);
  const state = computeFirmState(profile, scores, bands);
  return { ...state, recentScores: scores };
}
