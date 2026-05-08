import { describe, it, expect } from 'vitest';
import { findArithmeticError, regenHintForArithmeticError } from '@/lib/case-state/arithmetic-verifier';

describe('findArithmeticError', () => {
  it('returns null on text with no math expressions', () => {
    expect(findArithmeticError('Walk me through your structure.')).toBeNull();
  });

  it('returns null on correct multiplication', () => {
    expect(findArithmeticError('125,000 × $1.50 = $187.5K, that\'s the author take.')).toBeNull();
  });

  it('catches an off-by-magnitude error', () => {
    const err = findArithmeticError('125,000 × $1.50 = $1.875M total revenue.');
    expect(err).not.toBeNull();
    expect(err!.stated_result).toBeCloseTo(1_875_000);
    expect(err!.correct_result).toBeCloseTo(187_500);
  });

  it('catches a small arithmetic error', () => {
    const err = findArithmeticError('200 × 30 = 7000');
    expect(err).not.toBeNull();
    expect(err!.correct_result).toBe(6000);
  });

  it('tolerates 5% rounding drift', () => {
    // 125,000 × $1.50 = $187,500. Saying $188K is within 5% rounding.
    expect(findArithmeticError('125,000 × $1.50 = $188K')).toBeNull();
  });

  it('handles division', () => {
    const err = findArithmeticError('$10M / 1.5 = $5M');
    expect(err).not.toBeNull();
    expect(err!.correct_result).toBeCloseTo(6_666_666.67, -3);
  });

  it('passes correct division', () => {
    expect(findArithmeticError('$10M / 5 = $2M')).toBeNull();
  });

  it('handles K and M scales', () => {
    expect(findArithmeticError('500K × 4 = 2M')).toBeNull();
  });

  it('catches scale-mismatch', () => {
    const err = findArithmeticError('500K × 4 = 200M');
    expect(err).not.toBeNull();
  });

  it('only flags the FIRST error (no spam)', () => {
    const err = findArithmeticError('Bad: 200 × 200 = 50000. Also bad: 300 × 300 = 100000.');
    expect(err).not.toBeNull();
    // Should be the first one (200 × 200)
    expect(err!.expression).toMatch(/200\s*[×x*]\s*200/);
  });
});

describe('regenHintForArithmeticError', () => {
  it('produces a forward-looking correction hint', () => {
    const hint = regenHintForArithmeticError({
      expression: '125,000 × $1.50 = $1.875M',
      stated_result: 1_875_000,
      correct_result: 187_500,
      evidence: 'test',
    });
    expect(hint).toContain('CORRECT value');
    expect(hint).toContain('Sanity check');
    expect(hint).toContain('end with a probe');
  });
});
