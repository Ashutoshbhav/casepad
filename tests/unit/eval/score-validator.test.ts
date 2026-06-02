import { describe, it, expect } from 'vitest';
import {
  validateScore,
  extractCandidateMathSignals,
  candidateTurnCount,
  type CandidateSignals,
} from '@/lib/eval/score-validator';

const NO_SIGNALS: CandidateSignals = { mathErrors: [] };

// A fully-passing consulting breakdown (all dims >=60% weight; total 89).
const strongRaw = {
  structure: 22,
  quant_reasoning: 18,
  business_judgment: 13,
  communication: 13,
  hypothesis_management: 9,
  creativity: 9,
  synthesis: 5,
  total: 89,
  strengths: ['clean MECE tree'],
  gaps: [],
  spike_moments: ['pivoted from cost to revenue when fixed costs ruled out'],
};

describe('validateScore — total integrity', () => {
  it('recomputes total from dimensions, ignoring the LLM-reported total', () => {
    const out = validateScore({ ...strongRaw, total: 999 }, 'consulting', NO_SIGNALS, false);
    expect(out.total).toBe(89); // 22+18+13+13+9+9+5
  });

  it('clamps any dimension above its weight', () => {
    const out = validateScore({ ...strongRaw, structure: 100 }, 'consulting', NO_SIGNALS, false);
    expect(out.structure).toBe(25); // weight cap
  });

  it('coerces missing/garbage dimensions to 0', () => {
    const out = validateScore({ structure: 'lots', spike_moments: [] }, 'consulting', NO_SIGNALS, false);
    expect(out.structure).toBe(0);
    expect(out.total).toBe(0);
  });
});

describe('validateScore — verdict logic', () => {
  it('marks STRONG when total>=75 AND a spike exists with no below-3', () => {
    const out = validateScore(strongRaw, 'consulting', NO_SIGNALS, false);
    expect(out.verdict).toBe('strong');
    expect(out.below_3_flags).toEqual([]);
  });

  it('downgrades to PASS when no spike moment (even if total high)', () => {
    const out = validateScore({ ...strongRaw, spike_moments: [] }, 'consulting', NO_SIGNALS, false);
    expect(out.verdict).toBe('pass');
  });

  it('PASS band: all dims >=60% but total<75 and no spike', () => {
    const passRaw = {
      structure: 16, quant_reasoning: 12, business_judgment: 9, communication: 9,
      hypothesis_management: 6, creativity: 6, synthesis: 3, spike_moments: [],
    };
    const out = validateScore(passRaw, 'consulting', NO_SIGNALS, false);
    expect(out.total).toBe(61);
    expect(out.below_3_flags).toEqual([]);
    expect(out.verdict).toBe('pass');
  });

  it('REJECTS when any dimension is below 60% of its weight', () => {
    // communication = 5/15 = 33% -> below-3 flag -> reject
    const out = validateScore({ ...strongRaw, communication: 5 }, 'consulting', NO_SIGNALS, false);
    expect(out.below_3_flags).toContain('Communication');
    expect(out.verdict).toBe('reject');
  });

  it('marks INSUFFICIENT when the session is too short, regardless of dims', () => {
    const out = validateScore(strongRaw, 'consulting', NO_SIGNALS, true);
    expect(out.verdict).toBe('insufficient');
    expect(out.insufficient_data).toBe(true);
  });

  it('honors LLM insufficient_data even when not too short', () => {
    const out = validateScore({ ...strongRaw, insufficient_data: true }, 'consulting', NO_SIGNALS, false);
    expect(out.verdict).toBe('insufficient');
  });
});

describe('validateScore — deterministic candidate-math grounding', () => {
  it('caps the quant dimension at half-weight on a real arithmetic error and flags it', () => {
    const signals: CandidateSignals = { mathErrors: [{ evidence: '"200 x 30 = 8000" — 200 × 30 = 6000, not 8000' }] };
    const out = validateScore(strongRaw, 'consulting', signals, false);
    // Quant Reasoning weight 20 -> capped at floor(0.5*20)=10, which is <60% (12) -> below-3 -> reject
    expect(out.quant_reasoning).toBe(10);
    expect(out.below_3_flags).toContain('Quant Reasoning');
    expect(out.verdict).toBe('reject');
    expect((out.gaps as string[])[0]).toMatch(/[Aa]rithmetic/);
    expect((out.signals as { candidate_math_errors: string[] }).candidate_math_errors.length).toBe(1);
  });
});

describe('validateScore — output shape (backward compatibility)', () => {
  it('preserves the flat dimension keys + total + strengths/gaps and adds the new fields', () => {
    const out = validateScore(strongRaw, 'consulting', NO_SIGNALS, false);
    // legacy-readable flat keys
    expect(typeof out.structure).toBe('number');
    expect(typeof out.total).toBe('number');
    expect(Array.isArray(out.strengths)).toBe(true);
    // new fields
    expect(out.scheme).toBe('track-v2');
    expect(out.rubric_version).toBe(2);
    expect(['strong', 'pass', 'reject', 'insufficient']).toContain(out.verdict);
  });
});

describe('extractCandidateMathSignals', () => {
  it('flags a candidate (user) arithmetic error and ignores interviewer turns', () => {
    const transcript = [
      { role: 'interviewer', content: 'What is the revenue impact?' },
      { role: 'user', content: 'If we sell 200 units at 30 each, that is 200 x 30 = 8000 in revenue.' },
      { role: 'interviewer', content: 'Walk me through your reasoning.' },
    ];
    const sig = extractCandidateMathSignals(transcript);
    expect(sig.mathErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('returns no errors for correct candidate math', () => {
    const transcript = [{ role: 'user', content: '200 x 30 = 6000, so revenue is 6000.' }];
    expect(extractCandidateMathSignals(transcript).mathErrors.length).toBe(0);
  });

  it('handles null/empty transcript safely', () => {
    expect(extractCandidateMathSignals(null).mathErrors).toEqual([]);
    expect(candidateTurnCount(null)).toBe(0);
  });
});
