import { describe, it, expect } from 'vitest';
import { quadraticWeightedKappa, toBucket, calibrate } from '@/lib/skills/qwk';

describe('toBucket', () => {
  it('maps 0..1 into ordinal bins and clamps', () => {
    expect(toBucket(0)).toBe(0);
    expect(toBucket(0.5)).toBe(2);
    expect(toBucket(1)).toBe(4);
    expect(toBucket(1.5)).toBe(4);
    expect(toBucket(-1)).toBe(0);
    expect(toBucket(0.5, 10)).toBe(5);
  });
});

describe('quadraticWeightedKappa', () => {
  it('is 1.0 for perfect agreement (with spread)', () => {
    const a = [0, 1, 2, 3, 4, 0, 4];
    expect(quadraticWeightedKappa(a, [...a])).toBeCloseTo(1, 6);
  });

  it('is near 0 for independent-looking ratings', () => {
    const a = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
    const b = [4, 3, 2, 1, 0, 4, 3, 2, 1, 0]; // perfectly anti-correlated
    expect(quadraticWeightedKappa(a, b)).toBeLessThan(0);
  });

  it('rewards near-misses over far-misses', () => {
    const gold = [0, 1, 2, 3, 4, 2, 2, 3];
    const near = gold.map((g) => Math.min(4, g + 1)); // off by 1
    const far = gold.map((g) => (g + 3) % 5); // off by ~3
    expect(quadraticWeightedKappa(gold, near)).toBeGreaterThan(
      quadraticWeightedKappa(gold, far),
    );
  });

  it('returns NaN when BOTH raters used the same single category (no disagreement possible)', () => {
    expect(Number.isNaN(quadraticWeightedKappa([2, 2, 2, 2], [2, 2, 2, 2]))).toBe(true);
  });

  it('returns a finite value when only one rater is constant', () => {
    const v = quadraticWeightedKappa([2, 2, 2, 2], [1, 3, 2, 4]);
    expect(Number.isFinite(v)).toBe(true);
  });

  it('throws on mismatched lengths', () => {
    expect(() => quadraticWeightedKappa([1, 2], [1])).toThrow();
  });
});

describe('calibrate', () => {
  it('computes overall + per-skill QWK and sets gate flags', () => {
    const rows = [
      { skillId: 'mece_decomposition', tracer: 0.9, gold: 0.85 },
      { skillId: 'mece_decomposition', tracer: 0.2, gold: 0.25 },
      { skillId: 'sanity_checking', tracer: 0.1, gold: 0.15 },
      { skillId: 'sanity_checking', tracer: 0.8, gold: 0.75 },
      { skillId: 'concision', tracer: 0.5, gold: 0.55 },
      { skillId: 'concision', tracer: 0.3, gold: 0.35 },
    ];
    const r = calibrate(rows);
    expect(r.pairs).toBe(6);
    expect(r.overall).toBeGreaterThan(0.6);
    expect(r.showScores).toBe(true);
    expect(Object.keys(r.bySkill).sort()).toEqual(
      ['concision', 'mece_decomposition', 'sanity_checking'],
    );
  });

  it('flags not-ready when tracer disagrees badly', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      skillId: 's',
      tracer: i % 2 === 0 ? 0.9 : 0.1,
      gold: i % 2 === 0 ? 0.1 : 0.9,
    }));
    const r = calibrate(rows);
    expect(r.showScores).toBe(false);
    expect(r.driveAssignment).toBe(false);
  });
});
