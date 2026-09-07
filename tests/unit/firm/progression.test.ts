import { describe, it, expect } from 'vitest';
import { computeFirmState, rollingAvg, type FirmProfileRow } from '@/lib/firm/progression';
import { LEVELS, TOP_LEVEL_INDEX } from '@/lib/firm/levels';

const row = (o: Partial<FirmProfileRow>): FirmProfileRow => ({
  level: 0,
  engagements_completed: 0,
  engagements_at_level: 0,
  ...o,
});

describe('rollingAvg', () => {
  it('averages the first N and handles empty', () => {
    expect(rollingAvg([], 5)).toBe(0);
    expect(rollingAvg([60, 70, 80, 10, 10], 3)).toBeCloseTo(70, 5);
    expect(rollingAvg([50], 5)).toBe(50);
  });
});

describe('computeFirmState', () => {
  it('a fresh analyst has all criteria unmet and progress ~0', () => {
    const s = computeFirmState(row({}), [], { solid: 0, strong: 0 });
    expect(s.title).toBe('Analyst');
    expect(s.nextTitle).toBe('Consultant');
    expect(s.atTop).toBe(false);
    expect(s.promoEligible).toBe(false);
    expect(s.promoProgress).toBeCloseTo(0, 1);
    expect(s.criteria.map((c) => c.met)).toEqual([false, false, false]);
  });

  it('analyst -> consultant: eligible only when engagements + avg + skills all clear', () => {
    // Analyst promo: 5 engagements, avg>=50 over last 5, 6 skills Solid+
    const notYet = computeFirmState(
      row({ engagements_at_level: 5, engagements_completed: 5 }),
      [55, 55, 55, 55, 55],
      { solid: 3, strong: 0 }, // skills short
    );
    expect(notYet.criteria.find((c) => c.key === 'skills_solid')!.met).toBe(false);
    expect(notYet.promoEligible).toBe(false);

    const eligible = computeFirmState(
      row({ engagements_at_level: 5, engagements_completed: 5 }),
      [55, 55, 55, 55, 55],
      { solid: 7, strong: 1 },
    );
    expect(eligible.criteria.every((c) => c.met)).toBe(true);
    expect(eligible.promoEligible).toBe(true);
    expect(eligible.promoProgress).toBe(1);
  });

  it('avg uses the rolling window, not all history', () => {
    // 6 recent, window 5 -> the oldest (a 10) is excluded, avg of five 60s = 60
    const s = computeFirmState(
      row({ level: 0, engagements_at_level: 5 }),
      [60, 60, 60, 60, 60, 10],
      { solid: 6, strong: 0 },
    );
    expect(s.criteria.find((c) => c.key === 'avg_score')!.current).toBe(60);
    expect(s.criteria.find((c) => c.key === 'avg_score')!.met).toBe(true);
  });

  it('mid-ladder levels add a "Strong" criterion', () => {
    const s = computeFirmState(
      row({ level: 2, engagements_at_level: 2 }), // Senior Consultant
      [60],
      { solid: 5, strong: 1 },
    );
    expect(s.title).toBe('Senior Consultant');
    expect(s.criteria.some((c) => c.key === 'skills_strong')).toBe(true);
  });

  it('the top rank is terminal — no criteria, progress 1', () => {
    const s = computeFirmState(row({ level: TOP_LEVEL_INDEX }), [], { solid: 0, strong: 0 });
    expect(s.title).toBe(LEVELS[TOP_LEVEL_INDEX].title);
    expect(s.atTop).toBe(true);
    expect(s.nextTitle).toBeNull();
    expect(s.criteria).toEqual([]);
    expect(s.promoProgress).toBe(1);
  });

  it('clamps an out-of-range stored level', () => {
    expect(computeFirmState(row({ level: 99 }), [], { solid: 0, strong: 0 }).title).toBe(
      LEVELS[TOP_LEVEL_INDEX].title,
    );
    expect(computeFirmState(row({ level: -3 }), [], { solid: 0, strong: 0 }).title).toBe('Analyst');
  });
});
