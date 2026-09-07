// src/lib/calibration/apply.ts
//
// DB glue for Stage-4 case calibration. `calibrateCaseFromSession()` fires
// fire-and-forget after a session is scored — same fortress contract as the
// twin and the firm: never throws, never blocks, once per session.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSkillProfile } from '@/lib/skills/apply';
import {
  updateCaseRating,
  DEFAULT_CASE_RATING,
  type CaseRating,
} from './case-elo';

/** A candidate's implied overall rating = mean of their observed skill
 *  estimates (Glicko rating, not rating-RD), or 1500 if untracked. Couples
 *  the case Elo to the Stage-1 twin. */
async function candidateRating(supabase: SupabaseClient, userId: string): Promise<number> {
  try {
    const p = await getSkillProfile(supabase, userId);
    const rated = p.entries.filter((e) => e.obsCount > 0);
    if (rated.length === 0) return 1500;
    return rated.reduce((n, e) => n + e.rating, 0) / rated.length;
  } catch {
    return 1500;
  }
}

export async function calibrateCaseFromSession(
  supabase: SupabaseClient,
  input: { caseId: string | null; userId: string; score: number | null },
): Promise<void> {
  try {
    if (!input.caseId || input.score == null) return; // caseless / unscored session

    const { data: row } = await supabase
      .from('case_calibration')
      .select('rating, rd, plays')
      .eq('case_id', input.caseId)
      .maybeSingle();
    const current: CaseRating = row
      ? { rating: row.rating ?? 1500, rd: row.rd ?? 350, plays: row.plays ?? 0 }
      : { ...DEFAULT_CASE_RATING };

    const cRating = await candidateRating(supabase, input.userId);
    const next = updateCaseRating(current, input.score / 100, cRating);

    const { error } = await supabase.from('case_calibration').upsert(
      {
        case_id: input.caseId,
        rating: next.rating,
        rd: next.rd,
        plays: next.plays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'case_id' },
    );
    if (error) throw error;
  } catch (err) {
    try {
      const { logFailure } = await import('@/lib/observability/log-failure');
      void logFailure('evaluate', err, {
        sessionId: input.caseId ?? undefined,
        detail: 'case difficulty calibration failed (best-effort)',
      });
    } catch {
      console.error('[calibration] case elo failed:', err instanceof Error ? err.message : err);
    }
  }
}
