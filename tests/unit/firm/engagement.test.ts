import { describe, it, expect } from 'vitest';
import {
  buildEngagementBrief,
  effectiveDifficulty,
  rankTargetRating,
  MIN_CONFIDENT_PLAYS,
  type SkillProfileLike,
} from '@/lib/firm/engagement';
import type { SkillGroup } from '@/lib/skills/taxonomy';

// Helper: build a minimal profile where every named group's skills sit at a
// given estimate, and everything else sits high (so the named group is
// unambiguously the weakest).
function profile(weak: Partial<Record<SkillGroup, number>>, obsEach = 3): SkillProfileLike {
  const groups: SkillGroup[] = [
    'structuring',
    'quantitative',
    'analysis',
    'synthesis',
    'communication',
    'business_judgment',
  ];
  const entries: SkillProfileLike['entries'] = [];
  for (const g of groups) {
    const est = weak[g] ?? 1600;
    // two skills per group is enough for the mean + focus-skill slice
    entries.push({ skillId: `${g}_a`, name: `${g} A`, group: g, estimate: est, obsCount: obsEach });
    entries.push({ skillId: `${g}_b`, name: `${g} B`, group: g, estimate: est + 20, obsCount: obsEach });
  }
  return { entries };
}

describe('buildEngagementBrief — difficulty by rank', () => {
  it('Analyst (0) gets the gentle mix', () => {
    const b = buildEngagementBrief(0, null);
    expect(b.difficultyPrefs[0]).toBe('easy');
    expect(b.rankTitle).toBe('Analyst');
  });

  it('Partner (5) gets pushed to expert', () => {
    const b = buildEngagementBrief(5, null);
    expect(b.difficultyPrefs[0]).toBe('expert');
  });

  it('out-of-range level index clamps', () => {
    expect(buildEngagementBrief(99, null).rankTitle).toBe('Partner');
    expect(buildEngagementBrief(-3, null).rankTitle).toBe('Analyst');
  });
});

describe('buildEngagementBrief — Twin signal gating', () => {
  it('no profile → rank-only, not twin-driven', () => {
    const b = buildEngagementBrief(1, null);
    expect(b.twinDriven).toBe(false);
    expect(b.focusGroup).toBeNull();
    expect(b.caseTypePrefs).toEqual([]);
    expect(b.rationale).toContain('baseline');
  });

  it('too few observations → rank-only', () => {
    // 6 skills * 1 obs = 6 total, but minObservations default is 6 → borderline;
    // use obsEach 0.something is impossible, so set obsEach small via a custom profile
    const thin: SkillProfileLike = {
      entries: [
        { skillId: 'quantitative_a', name: 'q', group: 'quantitative', estimate: 1200, obsCount: 2 },
      ],
    };
    const b = buildEngagementBrief(2, thin);
    expect(b.twinDriven).toBe(false);
  });

  it('enough observations → twin-driven, targets the weakest group', () => {
    const b = buildEngagementBrief(2, profile({ quantitative: 1150 }));
    expect(b.twinDriven).toBe(true);
    expect(b.focusGroup).toBe('quantitative');
    expect(b.caseTypePrefs[0]).toBe('estimation');
    expect(b.focusSkillIds).toContain('quantitative_a');
    expect(b.rationale.toLowerCase()).toContain('quantitative a');
  });
});

describe('buildEngagementBrief — group → case_type mapping', () => {
  it('structuring weakness → profitability-first', () => {
    const b = buildEngagementBrief(1, profile({ structuring: 1100 }));
    expect(b.focusGroup).toBe('structuring');
    expect(b.caseTypePrefs[0]).toBe('profitability');
  });

  it('synthesis weakness → recommendation-heavy types', () => {
    const b = buildEngagementBrief(3, profile({ synthesis: 1100 }));
    expect(b.caseTypePrefs).toContain('market_entry');
    expect(b.caseTypePrefs).toContain('gtm');
  });

  it('communication weakness → no case_type filter (every case tests delivery)', () => {
    const b = buildEngagementBrief(2, profile({ communication: 1050 }));
    expect(b.focusGroup).toBe('communication');
    expect(b.caseTypePrefs).toEqual([]);
    expect(b.twinDriven).toBe(true);
    expect(b.rationale.toLowerCase()).toContain('run the room');
  });
});

describe('effectiveDifficulty — calibrated band overrules the label once trusted', () => {
  it('no calibration row → the corpus label stands', () => {
    expect(effectiveDifficulty('hard', undefined)).toBe('hard');
    expect(effectiveDifficulty('expert', undefined)).toBe('expert');
  });

  it('too few plays → label still stands', () => {
    expect(effectiveDifficulty('easy', { rating: 1750, plays: MIN_CONFIDENT_PLAYS - 1 })).toBe('easy');
  });

  it('enough plays → the Elo band wins', () => {
    // rating 1750 → bandFor → 'hard' even though the label says 'easy'
    expect(effectiveDifficulty('easy', { rating: 1750, plays: MIN_CONFIDENT_PLAYS })).toBe('hard');
    // a rated-hard case that everyone aces drops to 'easy'
    expect(effectiveDifficulty('hard', { rating: 1350, plays: 20 })).toBe('easy');
  });
});

describe('rankTargetRating — higher rank aims harder', () => {
  it('Analyst aims at their own level, Partner well above', () => {
    expect(rankTargetRating(1500, 0)).toBe(1500);
    expect(rankTargetRating(1500, 5)).toBe(1700);
  });
  it('is monotonic in rank', () => {
    const at = (i: number) => rankTargetRating(1400, i);
    expect(at(0)).toBeLessThan(at(1));
    expect(at(1)).toBeLessThan(at(3));
    expect(at(3)).toBeLessThan(at(5));
  });
});

describe('buildEngagementBrief — only rated groups count', () => {
  it('a group with zero observations is not eligible to be "weakest"', () => {
    const p: SkillProfileLike = {
      entries: [
        // quantitative unrated (obsCount 0) even though estimate is rock-bottom
        { skillId: 'quantitative_a', name: 'q', group: 'quantitative', estimate: 900, obsCount: 0 },
        { skillId: 'analysis_a', name: 'a1', group: 'analysis', estimate: 1300, obsCount: 4 },
        { skillId: 'analysis_b', name: 'a2', group: 'analysis', estimate: 1320, obsCount: 4 },
      ],
    };
    const b = buildEngagementBrief(2, p);
    expect(b.focusGroup).toBe('analysis');
  });
});
