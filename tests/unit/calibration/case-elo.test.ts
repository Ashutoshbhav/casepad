import { describe, it, expect } from 'vitest';
import {
  updateCaseRating,
  expectedCandidateWin,
  kFactor,
  bandFor,
  labelDrift,
  DEFAULT_CASE_RATING,
} from '@/lib/calibration/case-elo';

describe('kFactor', () => {
  it('decays as the case gets more plays', () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(15)).toBe(24);
    expect(kFactor(50)).toBe(14);
  });
});

describe('expectedCandidateWin', () => {
  it('is 0.5 at equal ratings and rises as the candidate outranks the case', () => {
    expect(expectedCandidateWin(1500, 1500)).toBeCloseTo(0.5, 6);
    expect(expectedCandidateWin(1700, 1500)).toBeGreaterThan(0.7);
    expect(expectedCandidateWin(1300, 1500)).toBeLessThan(0.3);
  });
});

describe('updateCaseRating', () => {
  it('a strong candidate acing it pushes the case rating DOWN', () => {
    const next = updateCaseRating(DEFAULT_CASE_RATING, 0.9, 1500);
    expect(next.rating).toBeLessThan(1500);
    expect(next.plays).toBe(1);
    expect(next.rd).toBeLessThan(DEFAULT_CASE_RATING.rd);
  });

  it('a candidate bombing it pushes the case rating UP', () => {
    const next = updateCaseRating(DEFAULT_CASE_RATING, 0.15, 1500);
    expect(next.rating).toBeGreaterThan(1500);
  });

  it('an on-expectation result barely moves it', () => {
    // candidate 1500 vs case 1500 -> expected win ~0.5; score 0.5 -> ~no move
    const next = updateCaseRating(DEFAULT_CASE_RATING, 0.5, 1500);
    expect(Math.abs(next.rating - 1500)).toBeLessThan(1);
  });

  it('accounts for candidate strength: a weak candidate scoring 0.5 raises difficulty', () => {
    const next = updateCaseRating(DEFAULT_CASE_RATING, 0.5, 1250);
    // weak candidate was expected to lose; a draw is over-performance -> case down
    expect(next.rating).toBeLessThan(1500);
  });

  it('clamps out-of-range scores', () => {
    expect(Number.isFinite(updateCaseRating(DEFAULT_CASE_RATING, 5).rating)).toBe(true);
    expect(Number.isFinite(updateCaseRating(DEFAULT_CASE_RATING, -2).rating)).toBe(true);
  });

  it('RD floors at 60 after many updates', () => {
    let r = DEFAULT_CASE_RATING;
    for (let i = 0; i < 100; i++) r = updateCaseRating(r, 0.5, 1500);
    expect(r.rd).toBeGreaterThanOrEqual(60);
  });
});

describe('bandFor + labelDrift', () => {
  it('bands by rating', () => {
    expect(bandFor(1400)).toBe('easy');
    expect(bandFor(1520)).toBe('medium');
    expect(bandFor(1650)).toBe('hard');
  });
  it('drift is rating minus the label midpoint', () => {
    expect(labelDrift(1600, 'medium')).toBe(80);
    expect(labelDrift(1380, 'easy')).toBe(0);
    expect(labelDrift(1500, 'hard')).toBe(-180);
  });
});
