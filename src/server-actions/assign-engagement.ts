import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getFirmView } from '@/lib/firm/apply';
import { getSkillProfile } from '@/lib/skills/apply';
import { buildEngagementBrief, type EngagementBrief } from '@/lib/firm/engagement';
import type { Track } from '@/lib/tracks';
import type { CaseDifficulty, CaseTypeEnum } from '@/lib/types/domain';

// "The Firm" — resolve a firm-aware engagement (PRD v3.1 Stage 3.3).
//
// This is the read side of engagement assignment: given a user, work out their
// rank (Stage 3) and their weakest skill group (Stage 1 Twin), turn that into
// an EngagementBrief (src/lib/firm/engagement.ts), then walk the corpus for the
// best-matching case they haven't done yet.
//
// Resolution order (each step relaxes one constraint):
//   1. generated case, focus case_type, a preferred difficulty
//   2. corpus case,    focus case_type × difficulty, in preference order
//   3. corpus case,    focus case_type, any difficulty
//   4. corpus case,    any type, a preferred difficulty
//   5. corpus case,    any type, any difficulty (last resort)
// Track is always respected; attempted cases are always excluded.
//
// Fortress-safe: every failure path returns null and the caller renders
// without the card. Never throws.

export interface ResolvedEngagement {
  brief: EngagementBrief;
  caseId: string;
  caseTitle: string;
  caseType: string;
  caseDifficulty: CaseDifficulty;
  /** true when the served case is a generated (not corpus) case. */
  generated: boolean;
  /** which resolution step produced the pick — for logging / debug. */
  matchQuality: 'exact' | 'type_only' | 'difficulty_only' | 'fallback';
}

interface CaseCandidate {
  id: string;
  title: string;
  case_type: string;
  difficulty: CaseDifficulty;
  provenance: unknown;
}

const SELECT = 'id, title, case_type, difficulty, provenance';

export async function assignEngagement(
  userId: string,
  preferredTrack: Track | null,
): Promise<ResolvedEngagement | null> {
  try {
    const supa = createSupabaseAdminClient();
    const track: Track = preferredTrack ?? 'consulting';

    // 1. Rank + Twin, in parallel.
    const [firm, profile] = await Promise.all([
      getFirmView(supa, userId).catch(() => null),
      getSkillProfile(supa, userId).catch(() => null),
    ]);
    const levelIndex = firm?.levelIndex ?? 0;
    const brief = buildEngagementBrief(levelIndex, profile);

    // 2. What has this user already attempted?
    const { data: sessRows } = await supa
      .from('sessions')
      .select('case_id')
      .eq('user_id', userId)
      .limit(1000);
    const attempted = new Set((sessRows ?? []).map((r) => r.case_id as string));

    // 3. Pull the track's cases once, then filter/rank in memory. The corpus
    //    per track is small enough (<2k) that one query beats many.
    const { data: caseRows, error } = await supa
      .from('cases')
      .select(SELECT)
      .contains('tracks', [track])
      .limit(3000);
    if (error) {
      console.warn('[assign-engagement] cases read failed:', error.message);
      return null;
    }

    const pool = ((caseRows ?? []) as CaseCandidate[]).filter((c) => !attempted.has(c.id));
    if (pool.length === 0) return null;

    const isGenerated = (c: CaseCandidate) =>
      !!c.provenance &&
      typeof c.provenance === 'object' &&
      (c.provenance as { generated?: unknown }).generated === true;

    const typeSet = new Set<string>(brief.caseTypePrefs as string[]);
    const diffRank = (d: CaseDifficulty) => {
      const i = brief.difficultyPrefs.indexOf(d);
      return i === -1 ? brief.difficultyPrefs.length + 1 : i;
    };

    // --- Step 1: generated case matching focus type + a preferred difficulty.
    if (typeSet.size > 0) {
      const gen = pool
        .filter((c) => isGenerated(c) && typeSet.has(c.case_type) && brief.difficultyPrefs.includes(c.difficulty))
        .sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty));
      if (gen[0]) return build(brief, gen[0], true, 'exact');
    }

    // --- Step 2: corpus, focus type × difficulty, in preference order.
    if (typeSet.size > 0) {
      const exact = pool
        .filter((c) => typeSet.has(c.case_type) && brief.difficultyPrefs.includes(c.difficulty))
        .sort((a, b) => {
          // primary: case_type preference order; secondary: difficulty order
          const ta = brief.caseTypePrefs.indexOf(a.case_type as CaseTypeEnum);
          const tb = brief.caseTypePrefs.indexOf(b.case_type as CaseTypeEnum);
          if (ta !== tb) return ta - tb;
          return diffRank(a.difficulty) - diffRank(b.difficulty);
        });
      if (exact[0]) return build(brief, exact[0], isGenerated(exact[0]), 'exact');

      // --- Step 3: focus type, any difficulty.
      const typeOnly = pool
        .filter((c) => typeSet.has(c.case_type))
        .sort((a, b) => {
          const ta = brief.caseTypePrefs.indexOf(a.case_type as CaseTypeEnum);
          const tb = brief.caseTypePrefs.indexOf(b.case_type as CaseTypeEnum);
          return ta - tb;
        });
      if (typeOnly[0]) return build(brief, typeOnly[0], isGenerated(typeOnly[0]), 'type_only');
    }

    // --- Step 4: any type, a preferred difficulty.
    const diffOnly = pool
      .filter((c) => brief.difficultyPrefs.includes(c.difficulty))
      .sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty));
    if (diffOnly[0]) return build(brief, diffOnly[0], isGenerated(diffOnly[0]), 'difficulty_only');

    // --- Step 5: anything unattempted in the track.
    return build(brief, pool[0], isGenerated(pool[0]), 'fallback');
  } catch (err) {
    console.error('[assign-engagement] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function build(
  brief: EngagementBrief,
  c: CaseCandidate,
  generated: boolean,
  matchQuality: ResolvedEngagement['matchQuality'],
): ResolvedEngagement {
  return {
    brief,
    caseId: c.id,
    caseTitle: c.title,
    caseType: c.case_type,
    caseDifficulty: c.difficulty,
    generated,
    matchQuality,
  };
}
