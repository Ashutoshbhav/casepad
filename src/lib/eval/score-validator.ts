// Candidate-score validator (Wave 2, 2026-06-02).
//
// THE PROBLEM IT FIXES: the candidate's grade used to be whatever `total` the
// LLM self-reported — no recompute, per-dimension caps unenforced, and the
// "below-3 on any dimension = reject" / "spike required for top band" rules
// were only *described* to the model, never enforced. See the audit
// (docs/BACKEND-AUDIT-2026-06-02.md, H1/H2) + redesign spec.
//
// THE FIX: the LLM proposes per-dimension scores + evidence; CODE computes the
// verdict. We recompute the total, clamp each dimension to its weight, ground
// the quantitative dimension in a DETERMINISTIC candidate-math check (real
// arithmetic errors cap it — not LLM vibes), and compute the verdict in code.
//
// Output is a SUPERSET of the old score_breakdown shape: the flat dimension
// keys + total + strengths/gaps/spike_moments are preserved verbatim so
// existing readers (/debrief, /cheatsheet) keep working; new fields (scheme,
// rubric_version, verdict, below_3_flags, signals) are additive.

import { TRACKS, type Track } from '@/lib/tracks';
import { findArithmeticError } from '@/lib/case-state/arithmetic-verifier';

export type Verdict = 'strong' | 'pass' | 'reject' | 'insufficient';

export interface CandidateSignals {
  /** Deterministic arithmetic errors found in the CANDIDATE's own turns. */
  mathErrors: { evidence: string }[];
  /**
   * Estimation-thread behavior (Wave 2 lever B). Present only on sizing cases.
   * Grades estimation on STRUCTURE + SANITY-CHECK — never on the final number's
   * proximity (per the interview-dynamics research).
   */
  estimation?: {
    active: boolean;
    structuredFirst: boolean;
    sanityChecked: boolean;
    blurtedNumber: boolean;
  };
}

// Dimension-key convention MUST match track-evaluator.ts:
//   `"${dimension.toLowerCase().replace(/\s+/g, '_')}"`
export const dimensionKey = (dimension: string): string =>
  dimension.toLowerCase().replace(/\s+/g, '_');

// The quantitative dimension per track — the one a real candidate arithmetic
// error should cap (you can't score "good" on quant if your math was wrong).
// null = the track has no arithmetic-graded dimension.
const QUANT_DIMENSION: Record<Track, string | null> = {
  consulting: 'Quant Reasoning',
  ib_pe_vc: 'Technical Accuracy',
  pm: 'Estimation',
  marketing: 'Quant Marketing',
  strategy_bizops: 'Quant Rigor',
  behavioral: null,
};

// Pass bar: a dimension scoring below 60% of its weight is a "below-3" flag.
// Mirrors the MBB 1-4 scale where <3 on any dimension = reject.
const PASS_FRACTION = 0.6;
// "Strong" band: total at/above this AND at least one genuine spike moment.
const STRONG_TOTAL = 75;

/** Extract deterministic candidate-math signals from a transcript. */
export function extractCandidateMathSignals(
  transcript: { role: string; content: string }[] | null | undefined
): CandidateSignals {
  const errors: { evidence: string }[] = [];
  if (Array.isArray(transcript)) {
    for (const t of transcript) {
      if (t?.role !== 'user' || typeof t.content !== 'string') continue;
      const err = findArithmeticError(t.content);
      if (err) errors.push({ evidence: err.evidence });
    }
  }
  return { mathErrors: errors };
}

/** Count the candidate's (user) turns — used to detect too-short sessions. */
export function candidateTurnCount(
  transcript: { role: string }[] | null | undefined
): number {
  if (!Array.isArray(transcript)) return 0;
  return transcript.filter((t) => t?.role === 'user').length;
}

/**
 * Validate + finalize a candidate score. Pure (given signals + tooShort).
 * Returns a superset of the legacy score_breakdown shape.
 */
export function validateScore(
  raw: unknown,
  track: Track,
  signals: CandidateSignals,
  tooShort: boolean
): Record<string, unknown> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const def = TRACKS[track];
  const quantDim = QUANT_DIMENSION[track];
  const hasMathError = signals.mathErrors.length > 0;

  const out: Record<string, unknown> = {
    track,
    scheme: 'track-v2',
    rubric_version: 2,
  };

  let total = 0;
  const below3: string[] = [];

  for (const dim of def.rubric) {
    const key = dimensionKey(dim.dimension);
    let v = Number(r[key]);
    if (!Number.isFinite(v)) v = 0;
    v = Math.round(v);
    v = Math.max(0, Math.min(dim.weight, v)); // clamp to [0, weight]

    // Deterministic grounding: a real candidate arithmetic error caps the
    // quant dimension at half its weight (clearly weak — can't be "good").
    if (hasMathError && quantDim && dim.dimension === quantDim) {
      v = Math.min(v, Math.floor(0.5 * dim.weight));
    }
    // Estimation grounding: blurting a number with no structure caps the quant
    // dimension (the canonical guesstimate fail). Conservative — only lowers,
    // never raises, and stacks under the stricter math-error cap above.
    if (signals.estimation?.active && quantDim && dim.dimension === quantDim) {
      if (signals.estimation.blurtedNumber) {
        v = Math.min(v, Math.floor(0.6 * dim.weight));
      }
    }

    out[key] = v;
    total += v;
    if (v < PASS_FRACTION * dim.weight) below3.push(dim.dimension);
  }

  out.total = total;

  const strengths = Array.isArray(r.strengths) ? (r.strengths as string[]).filter(Boolean).slice(0, 6) : [];
  const gaps = Array.isArray(r.gaps) ? (r.gaps as string[]).filter(Boolean).slice(0, 8) : [];
  if (hasMathError) {
    gaps.unshift(
      `Arithmetic error in your own numbers: ${signals.mathErrors.map((e) => e.evidence).slice(0, 2).join('; ')}`
    );
  }
  // Estimation feedback (sizing cases only). Grades process, not the number.
  const est = signals.estimation;
  if (est?.active) {
    if (est.blurtedNumber) {
      gaps.unshift('Jumped to a number without structuring the estimate — lay out the decomposition and state each assumption before computing.');
    } else if (!est.sanityChecked) {
      gaps.unshift('Never sanity-checked the estimate — gut-check the order of magnitude (e.g. collapse it to a per-capita / per-household number).');
    }
    if (est.structuredFirst && est.sanityChecked) {
      strengths.unshift('Structured the estimate before computing and sanity-checked the result.');
    }
  }
  out.strengths = strengths.slice(0, 6);
  out.gaps = gaps.slice(0, 8);
  out.spike_moments = Array.isArray(r.spike_moments) ? (r.spike_moments as string[]).filter(Boolean) : [];

  const insufficient = tooShort || r.insufficient_data === true;
  out.insufficient_data = insufficient;
  out.below_3_flags = below3;
  out.signals = {
    candidate_math_errors: signals.mathErrors.map((e) => e.evidence),
    ...(est?.active
      ? {
          estimation: {
            structured_first: est.structuredFirst,
            sanity_checked: est.sanityChecked,
            blurted_number: est.blurtedNumber,
          },
        }
      : {}),
  };

  // Verdict — computed in CODE, not trusted from the LLM.
  let verdict: Verdict;
  if (insufficient) verdict = 'insufficient';
  else if (below3.length > 0) verdict = 'reject'; // MBB: <3 on any dim = reject
  else if (total >= STRONG_TOTAL && (out.spike_moments as string[]).length >= 1) verdict = 'strong';
  else verdict = 'pass';
  out.verdict = verdict;

  return out;
}
