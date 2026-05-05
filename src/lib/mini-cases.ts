import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Mini-Case mode — Phase 0 (2026-05-06).
//
// Activation crisis fix: a 30-min full case is too high a barrier for first-
// time users (Sunday cohort: 0 completions). Mini-Case is the 3-turn / ~4-min
// daily drill that becomes the default daily action; the full case becomes
// the Saturday cathedral.
//
// Phase 0 scope:
//   - Curated picker filters to estimation cases with short problem statements
//     (ps_len 80..600 chars) — these are the cases that compress cleanly into
//     a 3-user-turn arc (structuring, math, synthesis).
//   - No new DB schema. Mini sessions live in the existing `sessions` table
//     and are differentiated only by URL param + 3-turn cap behavior.
//   - Daily picker is idempotent per (user_id, today IST) by reusing the same
//     sort order as the full-case picker so it doesn't re-roll mid-day.
//
// Phase 1 deferred: add `mode` column to sessions table, dedicated /debrief
// variant with lighter rubric, mini-specific eval prompt.

export interface MiniCasePick {
  caseId: string;
  caseTitle: string;
  caseDifficulty: string;
  caseType: string;
  reason: string;
}

const MINI_PS_MIN = 80;
const MINI_PS_MAX = 600;

// Pick a mini case for the user. Filters to estimation/sizing cases with
// short problem statements (cleaner 3-turn arc) and prefers cases the user
// hasn't attempted yet. Falls back to first match if everything's been done.
export async function pickMiniCase(userId: string): Promise<MiniCasePick | null> {
  const admin = createSupabaseAdminClient();

  // Fetch attempted case_ids so we don't re-serve. Defensive — failure
  // returns empty set and the picker proceeds without dedup.
  let attemptedSet = new Set<string>();
  try {
    const { data: attempted } = await admin
      .from('sessions')
      .select('case_id')
      .eq('user_id', userId);
    attemptedSet = new Set(
      (attempted ?? []).map((s) => s.case_id as string).filter(Boolean)
    );
  } catch (e) {
    console.warn('[mini-cases] attempted-fetch failed:', e);
  }

  // Curated filter: estimation cases with short PS. Stable sort by id so
  // re-runs same day produce the same pick (no re-roll).
  let candidates: Array<{
    id: string;
    title: string;
    difficulty: string;
    case_type: string;
    problem_statement: string | null;
  }> = [];
  try {
    const { data } = await admin
      .from('cases')
      .select('id, title, difficulty, case_type, problem_statement')
      .eq('case_type', 'estimation')
      .not('problem_statement', 'is', null)
      .order('id', { ascending: true })
      .limit(60);
    candidates = (data ?? []).filter((c) => {
      const len = (c.problem_statement || '').length;
      return len >= MINI_PS_MIN && len <= MINI_PS_MAX;
    });
  } catch (e) {
    console.warn('[mini-cases] candidate-fetch failed:', e);
  }

  if (candidates.length === 0) return null;

  // Prefer un-attempted. Fall back to attempted (re-do).
  const fresh = candidates.filter((c) => !attemptedSet.has(c.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  // Stable daily rotation — pick by (today's day-of-year) % pool.length so
  // each day shows a different drill but it's deterministic per day.
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getUTCFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const pick = pool[dayOfYear % pool.length];
  return {
    caseId: pick.id,
    caseTitle: pick.title,
    caseDifficulty: pick.difficulty,
    caseType: pick.case_type,
    reason: 'Quick rep — 3 turns, ~4 minutes. Builds the muscle, not the full session.',
  };
}

// Mini sessions are gated by a 3-user-turn cap. Server-side check used by
// chat route to refuse 4th user turn (defense in depth — client should
// already auto-submit on turn 3).
export const MINI_TURN_CAP = 3;

export function isMiniMode(searchParams: { mode?: string } | undefined): boolean {
  return searchParams?.mode === 'mini';
}
