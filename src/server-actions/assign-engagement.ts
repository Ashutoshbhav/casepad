import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getFirmView } from '@/lib/firm/apply';
import { getSkillProfile } from '@/lib/skills/apply';
import {
  buildEngagementBrief,
  effectiveDifficulty,
  rankTargetRating,
  type CaseCalib,
  type EngagementBrief,
} from '@/lib/firm/engagement';
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
  /** The difficulty to show the user — the calibrated (Elo) band when the
   *  case has been played enough to trust it, otherwise the corpus label. */
  caseDifficulty: CaseDifficulty;
  /** The raw corpus easy/medium/hard/expert label, always. */
  labelDifficulty: CaseDifficulty;
  /** true when `caseDifficulty` came from empirical calibration, not the label. */
  difficultyCalibrated: boolean;
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
      .order('created_at', { ascending: false })
      .limit(3000);
    if (error) {
      console.warn('[assign-engagement] cases read failed:', error.message);
      return null;
    }

    const pool = ((caseRows ?? []) as CaseCandidate[]).filter((c) => !attempted.has(c.id));
    if (pool.length === 0) return null;

    // 4. Empirical difficulty (Stage 4 Elo) for the pool, best-effort. A case
    //    with enough plays uses its calibrated band instead of the corpus
    //    label; the calibrated rating is also a within-bucket tiebreak.
    const calibById = new Map<string, CaseCalib>();
    try {
      const ids = pool.map((c) => c.id);
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        const { data: cal } = await supa
          .from('case_calibration')
          .select('case_id, rating, plays')
          .in('case_id', ids.slice(i, i + chunk));
        for (const r of cal ?? []) {
          calibById.set(r.case_id as string, {
            rating: Number(r.rating) || 1500,
            plays: Number(r.plays) || 0,
          });
        }
      }
    } catch (e) {
      console.warn('[assign-engagement] calibration read skipped:', e instanceof Error ? e.message : e);
    }

    const ratedSkills = (profile?.entries ?? []).filter((e) => e.obsCount > 0);
    const candRating =
      ratedSkills.length > 0
        ? ratedSkills.reduce((n, e) => n + e.rating, 0) / ratedSkills.length
        : 1500;
    const targetRating = rankTargetRating(candRating, brief.rankIndex);

    const isGenerated = (c: CaseCandidate) =>
      !!c.provenance &&
      typeof c.provenance === 'object' &&
      (c.provenance as { generated?: unknown }).generated === true;

    // The difficulty we actually match on — calibrated band when trusted.
    const effDiff = (c: CaseCandidate): CaseDifficulty =>
      effectiveDifficulty(c.difficulty, calibById.get(c.id));

    const typeSet = new Set<string>(brief.caseTypePrefs as string[]);
    const diffRank = (d: CaseDifficulty) => {
      const i = brief.difficultyPrefs.indexOf(d);
      return i === -1 ? brief.difficultyPrefs.length + 1 : i;
    };
    // Within a bucket: a calibrated case closest to the rank-scaled target
    // wins; an uncalibrated case is neutral (sorts after calibrated ones only
    // when they're a good match). Newer-first is the final fallback via the
    // query order.
    const ratingGap = (c: CaseCandidate) => {
      const cal = calibById.get(c.id);
      if (!cal || cal.plays < 1) return Number.POSITIVE_INFINITY;
      return Math.abs(cal.rating - targetRating);
    };
    const tieBreak = (a: CaseCandidate, b: CaseCandidate) => {
      const ga = ratingGap(a);
      const gb = ratingGap(b);
      if (ga === gb) return 0;
      if (!Number.isFinite(ga)) return 1;
      if (!Number.isFinite(gb)) return -1;
      return ga - gb;
    };

    // --- Step 1: generated case matching focus type + a preferred difficulty.
    if (typeSet.size > 0) {
      const gen = pool
        .filter((c) => isGenerated(c) && typeSet.has(c.case_type) && brief.difficultyPrefs.includes(effDiff(c)))
        .sort((a, b) => diffRank(effDiff(a)) - diffRank(effDiff(b)) || tieBreak(a, b));
      if (gen[0]) return build(brief, gen[0], true, 'exact', calibById);
    }

    // --- Step 2: corpus, focus type × difficulty, in preference order.
    if (typeSet.size > 0) {
      const exact = pool
        .filter((c) => typeSet.has(c.case_type) && brief.difficultyPrefs.includes(effDiff(c)))
        .sort((a, b) => {
          // primary: case_type preference order; then difficulty order; then
          // closeness of calibrated rating to the rank-scaled target.
          const ta = brief.caseTypePrefs.indexOf(a.case_type as CaseTypeEnum);
          const tb = brief.caseTypePrefs.indexOf(b.case_type as CaseTypeEnum);
          if (ta !== tb) return ta - tb;
          const d = diffRank(effDiff(a)) - diffRank(effDiff(b));
          if (d !== 0) return d;
          return tieBreak(a, b);
        });
      if (exact[0]) return build(brief, exact[0], isGenerated(exact[0]), 'exact', calibById);

      // --- Step 3: focus type, any difficulty.
      const typeOnly = pool
        .filter((c) => typeSet.has(c.case_type))
        .sort((a, b) => {
          const ta = brief.caseTypePrefs.indexOf(a.case_type as CaseTypeEnum);
          const tb = brief.caseTypePrefs.indexOf(b.case_type as CaseTypeEnum);
          if (ta !== tb) return ta - tb;
          return tieBreak(a, b);
        });
      if (typeOnly[0]) return build(brief, typeOnly[0], isGenerated(typeOnly[0]), 'type_only', calibById);
    }

    // --- Step 4: any type, a preferred difficulty.
    const diffOnly = pool
      .filter((c) => brief.difficultyPrefs.includes(effDiff(c)))
      .sort((a, b) => diffRank(effDiff(a)) - diffRank(effDiff(b)) || tieBreak(a, b));
    if (diffOnly[0]) return build(brief, diffOnly[0], isGenerated(diffOnly[0]), 'difficulty_only', calibById);

    // --- Step 5: anything unattempted in the track.
    return build(brief, pool[0], isGenerated(pool[0]), 'fallback', calibById);
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
  calibById: Map<string, CaseCalib>,
): ResolvedEngagement {
  const cal = calibById.get(c.id);
  const calibrated = !!cal && cal.plays >= 8;
  const shownDifficulty = calibrated ? effectiveDifficulty(c.difficulty, cal) : c.difficulty;
  return {
    brief,
    caseId: c.id,
    caseTitle: c.title,
    caseType: c.case_type,
    caseDifficulty: shownDifficulty,
    labelDifficulty: c.difficulty,
    difficultyCalibrated: calibrated,
    generated,
    matchQuality,
  };
}
