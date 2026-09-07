// src/lib/firm/progression.ts
//
// "The Firm" progression math (PRD v3.1 Stage 3). Pure — takes the stored
// profile + recent engagement scores + the skill-band counts, returns the
// current standing and progress toward the next promotion. The DB read/write
// lives in src/lib/firm/apply.ts.

import { LEVELS, levelAt, TOP_LEVEL_INDEX, type PromoCriteria } from './levels';

export interface FirmProfileRow {
  level: number;
  engagements_completed: number;
  /** engagements done since the last promotion (or since joining). */
  engagements_at_level: number;
  joined_at?: string | null;
  last_promo_at?: string | null;
}

export interface SkillBandCounts {
  /** micro-skills at band "Solid" or "Strong". */
  solid: number;
  /** micro-skills at band "Strong". */
  strong: number;
}

export interface PromoCriterion {
  key: 'engagements' | 'avg_score' | 'skills_solid' | 'skills_strong';
  label: string;
  current: number;
  target: number;
  met: boolean;
}

export interface FirmState {
  levelIndex: number;
  title: string;
  blurb: string;
  engagementsTotal: number;
  engagementsAtLevel: number;
  atTop: boolean;
  nextTitle: string | null;
  /** [] at the top rank. */
  criteria: PromoCriterion[];
  /** all criteria met — ready for a promotion review. */
  promoEligible: boolean;
  /** 0..1 rough overall progress to the next rank (mean of clamped ratios). */
  promoProgress: number;
}

/** Rolling average of the most recent `window` scores (already newest-first or
 *  oldest-first — order doesn't matter for a mean, we just take the last N by
 *  the caller's ordering). Returns 0 for an empty list. */
export function rollingAvg(scores: number[], window: number): number {
  if (scores.length === 0) return 0;
  const slice = scores.slice(0, Math.max(1, window));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function buildCriteria(
  promo: PromoCriteria,
  engagementsAtLevel: number,
  avg: number,
  bands: SkillBandCounts,
): PromoCriterion[] {
  const list: PromoCriterion[] = [
    {
      key: 'engagements',
      label: `Engagements at this level`,
      current: engagementsAtLevel,
      target: promo.engagementsAtLevel,
      met: engagementsAtLevel >= promo.engagementsAtLevel,
    },
    {
      key: 'avg_score',
      label: `Avg score, last ${promo.avgWindow}`,
      current: Math.round(avg),
      target: promo.avgScore,
      met: avg >= promo.avgScore,
    },
    {
      key: 'skills_solid',
      label: `Micro-skills at Solid+`,
      current: bands.solid,
      target: promo.skillsSolid,
      met: bands.solid >= promo.skillsSolid,
    },
  ];
  if (promo.skillsStrong > 0) {
    list.push({
      key: 'skills_strong',
      label: `Micro-skills at Strong`,
      current: bands.strong,
      target: promo.skillsStrong,
      met: bands.strong >= promo.skillsStrong,
    });
  }
  return list;
}

export function computeFirmState(
  profile: FirmProfileRow,
  recentScoresAtLevel: number[],
  bands: SkillBandCounts,
): FirmState {
  const level = levelAt(profile.level);
  const atTop = level.index >= TOP_LEVEL_INDEX || level.promo === null;
  const engagementsAtLevel = Math.max(0, profile.engagements_at_level);

  if (atTop || !level.promo) {
    return {
      levelIndex: level.index,
      title: level.title,
      blurb: level.blurb,
      engagementsTotal: Math.max(0, profile.engagements_completed),
      engagementsAtLevel,
      atTop: true,
      nextTitle: null,
      criteria: [],
      promoEligible: false,
      promoProgress: 1,
    };
  }

  const avg = rollingAvg(recentScoresAtLevel, level.promo.avgWindow);
  const criteria = buildCriteria(level.promo, engagementsAtLevel, avg, bands);
  const promoEligible = criteria.every((c) => c.met);
  const promoProgress =
    criteria.reduce((sum, c) => sum + Math.min(1, c.target === 0 ? 1 : c.current / c.target), 0) /
    criteria.length;

  return {
    levelIndex: level.index,
    title: level.title,
    blurb: level.blurb,
    engagementsTotal: Math.max(0, profile.engagements_completed),
    engagementsAtLevel,
    atTop: false,
    nextTitle: LEVELS[level.index + 1]?.title ?? null,
    criteria,
    promoEligible,
    promoProgress,
  };
}
