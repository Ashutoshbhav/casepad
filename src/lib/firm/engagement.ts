// src/lib/firm/engagement.ts
//
// "The Firm" — firm-aware engagement assignment (PRD v3.1 Stage 3.3). This is
// the join between the three stages:
//   - Stage 3 (rank)  → how hard the next engagement should be
//   - Stage 1 (Twin)  → which skill the next engagement should stress
//   - Stage 2 (corpus/generator) → what case_type delivers that stress
//
// Pure. Takes the firm level index + the skill profile, returns an
// EngagementBrief: an ordered difficulty preference, an ordered case_type
// preference, the skill group being targeted, and a user-facing rationale.
// The DB resolution (brief → an actual case row) lives in
// src/server-actions/assign-engagement.ts.

import { levelAt } from './levels';
import { SKILL_GROUPS, type SkillGroup } from '@/lib/skills/taxonomy';
import { bandFor } from '@/lib/calibration/case-elo';
import type { CaseDifficulty, CaseTypeEnum } from '@/lib/types/domain';

export interface SkillProfileLike {
  entries: {
    skillId: string;
    name: string;
    group: SkillGroup;
    estimate: number;
    obsCount: number;
  }[];
}

export interface EngagementBrief {
  rankIndex: number;
  rankTitle: string;
  /** Acceptable difficulties, most-preferred first. Never empty. */
  difficultyPrefs: CaseDifficulty[];
  /** case_type slugs to prefer, most-preferred first. [] = any type is fine
   *  (happens when the weak area is delivery/communication, which every case
   *  exercises). */
  caseTypePrefs: CaseTypeEnum[];
  /** The skill group this engagement is built to stress, or null if the Twin
   *  has no usable signal yet. */
  focusGroup: SkillGroup | null;
  focusGroupLabel: string | null;
  /** The specific weak skills inside that group we're targeting (for the
   *  debrief copy and, later, the generator seed match). */
  focusSkillIds: string[];
  focusSkillNames: string[];
  /** One-line "why you're getting this engagement". */
  rationale: string;
  /** True when the brief is rank-only (no Twin signal). */
  twinDriven: boolean;
}

// Rank → difficulty ladder. Index 0 (Analyst) gets the gentlest mix; the top
// ranks get pushed into hard/expert. Each list is a *preference order* — the
// resolver falls through to the next if the corpus has nothing.
const DIFFICULTY_BY_RANK: Record<number, CaseDifficulty[]> = {
  0: ['easy', 'medium'],
  1: ['medium', 'easy', 'hard'],
  2: ['medium', 'hard', 'easy'],
  3: ['hard', 'medium', 'expert'],
  4: ['hard', 'expert', 'medium'],
  5: ['expert', 'hard'],
};

// Which case_type best forces each skill group to show up. Ordered.
// - quantitative      → sizing / pricing put the math front and centre
// - structuring       → open profitability / entry cases reward a clean tree
// - analysis          → profitability + M&A are the data/root-cause archetypes
// - synthesis         → entry / gtm end on a real recommendation + risks
// - business_judgment → entry / pricing / gtm need commercial instinct
// - communication     → every case tests delivery; no type filter
const CASE_TYPES_BY_GROUP: Record<SkillGroup, CaseTypeEnum[]> = {
  quantitative: ['estimation', 'pricing', 'profitability'],
  structuring: ['profitability', 'market_entry', 'operations'],
  analysis: ['profitability', 'mna', 'operations'],
  synthesis: ['market_entry', 'gtm', 'mna'],
  business_judgment: ['market_entry', 'pricing', 'gtm'],
  communication: [],
};

// --- Stage 4 coupling: empirical difficulty ------------------------------

/** Plays needed before the calibrated (Elo) band is trusted over the corpus
 *  label. Below this the case's own easy/medium/hard label stands. */
export const MIN_CONFIDENT_PLAYS = 8;

export interface CaseCalib {
  rating: number;
  plays: number;
}

/** The difficulty to *match on*: the calibrated band once the case has been
 *  played enough for the Elo rating to mean something, otherwise the corpus
 *  label. Calibrated bands are only easy | medium | hard — a corpus "expert"
 *  label survives until calibration overrules it. */
export function effectiveDifficulty(
  label: CaseDifficulty,
  calib: CaseCalib | undefined,
): CaseDifficulty {
  if (!calib || calib.plays < MIN_CONFIDENT_PLAYS) return label;
  return bandFor(calib.rating);
}

/** Where on the rating scale a candidate at this rank should be pulled toward:
 *  their own implied rating plus a per-rank stretch, so a Partner lands at the
 *  hard end of a band and an Analyst at the gentle end. Used only as a
 *  within-bucket tiebreak. */
export function rankTargetRating(candidateRating: number, rankIndex: number): number {
  return candidateRating + rankIndex * 40; // +0 Analyst .. +200 Partner
}

/** Mean conservative estimate for a group, over its *rated* skills only.
 *  Returns null when the group has no observations yet. */
function groupMean(profile: SkillProfileLike, group: SkillGroup): number | null {
  const rated = profile.entries.filter((e) => e.group === group && e.obsCount > 0);
  if (rated.length === 0) return null;
  return rated.reduce((s, e) => s + e.estimate, 0) / rated.length;
}

/**
 * Build the brief for a user at `levelIndex` with the given Twin profile.
 * `minObservations` guards against steering off one or two noisy traces — the
 * Twin needs at least this many total rated observations before it drives the
 * case_type choice (below that, the brief is rank-only).
 */
export function buildEngagementBrief(
  levelIndex: number,
  profile: SkillProfileLike | null,
  opts: { minObservations?: number } = {},
): EngagementBrief {
  const minObs = opts.minObservations ?? 6;
  const level = levelAt(levelIndex);
  const difficultyPrefs = DIFFICULTY_BY_RANK[level.index] ?? ['medium', 'hard'];

  const totalObs =
    profile?.entries.reduce((n, e) => n + (e.obsCount > 0 ? e.obsCount : 0), 0) ?? 0;

  // No usable Twin signal yet — rank-only brief.
  if (!profile || totalObs < minObs) {
    return {
      rankIndex: level.index,
      rankTitle: level.title,
      difficultyPrefs,
      caseTypePrefs: [],
      focusGroup: null,
      focusGroupLabel: null,
      focusSkillIds: [],
      focusSkillNames: [],
      rationale:
        totalObs === 0
          ? `${level.title} · your first engagements set your baseline across every skill.`
          : `${level.title} · a few more engagements and the Firm will start targeting your weak spots.`,
      twinDriven: false,
    };
  }

  // Weakest group by mean conservative estimate.
  const groups = Object.keys(SKILL_GROUPS) as SkillGroup[];
  let focusGroup: SkillGroup | null = null;
  let worst = Infinity;
  for (const g of groups) {
    const m = groupMean(profile, g);
    if (m === null) continue;
    if (m < worst) {
      worst = m;
      focusGroup = g;
    }
  }

  if (!focusGroup) {
    return {
      rankIndex: level.index,
      rankTitle: level.title,
      difficultyPrefs,
      caseTypePrefs: [],
      focusGroup: null,
      focusGroupLabel: null,
      focusSkillIds: [],
      focusSkillNames: [],
      rationale: `${level.title} · balanced across skills — this one's a general engagement.`,
      twinDriven: false,
    };
  }

  // The two weakest *rated* skills inside that group — what the debrief calls out.
  const focusSkills = profile.entries
    .filter((e) => e.group === focusGroup && e.obsCount > 0)
    .sort((a, b) => a.estimate - b.estimate)
    .slice(0, 2);

  const label = SKILL_GROUPS[focusGroup];
  const caseTypePrefs = CASE_TYPES_BY_GROUP[focusGroup];

  const skillPhrase =
    focusSkills.length > 0
      ? focusSkills.map((s) => s.name.toLowerCase()).join(' and ')
      : label.toLowerCase();

  const rationale =
    caseTypePrefs.length > 0
      ? `${level.title} · targeting your weakest area — ${skillPhrase}. Expect a ${caseTypePrefs[0].replace(/_/g, ' ')}-style engagement at ${difficultyPrefs[0]} difficulty.`
      : `${level.title} · your weakest area is ${skillPhrase}, which every engagement tests — this one's about how you run the room, at ${difficultyPrefs[0]} difficulty.`;

  return {
    rankIndex: level.index,
    rankTitle: level.title,
    difficultyPrefs,
    caseTypePrefs,
    focusGroup,
    focusGroupLabel: label,
    focusSkillIds: focusSkills.map((s) => s.skillId),
    focusSkillNames: focusSkills.map((s) => s.name),
    rationale,
    twinDriven: true,
  };
}
