// src/lib/skills/qwk.ts
//
// Quadratic Weighted Kappa — the calibration target for the knowledge-tracing
// pass (PRD v3.1: show scores at QWK >= 0.6, drive assignment at >= 0.7).
// QWK measures agreement between two raters on an ordinal scale, correcting for
// chance and penalising big disagreements more than small ones.
//
// Pure + dependency-free. `scripts/qa/calibrate-tracer.ts` uses it to compare
// the tracer's per-skill quality against a human gold set.

/** Bucket a continuous 0..1 quality into `bins` ordinal levels (default 5). */
export function toBucket(quality: number, bins = 5): number {
  const q = quality < 0 ? 0 : quality > 1 ? 1 : quality;
  return Math.min(bins - 1, Math.floor(q * bins));
}

/**
 * QWK between two equal-length arrays of ordinal ratings in [0, bins-1].
 * Returns a number in roughly [-1, 1]; 1 = perfect agreement, 0 = chance,
 * negative = worse than chance. Returns NaN for < 2 items or a degenerate
 * case where both raters used a single identical category for everything
 * (agreement is total but kappa is undefined — callers treat NaN as
 * "insufficient signal").
 */
export function quadraticWeightedKappa(a: number[], b: number[], bins = 5): number {
  if (a.length !== b.length) throw new Error('qwk: arrays differ in length');
  const n = a.length;
  if (n < 2) return NaN;

  // observed matrix
  const O: number[][] = Array.from({ length: bins }, () => new Array(bins).fill(0));
  const histA = new Array(bins).fill(0);
  const histB = new Array(bins).fill(0);
  for (let i = 0; i < n; i++) {
    const x = clampInt(a[i], bins);
    const y = clampInt(b[i], bins);
    O[x][y] += 1;
    histA[x] += 1;
    histB[y] += 1;
  }

  // weight matrix (quadratic)
  const denom = (bins - 1) * (bins - 1);
  let num = 0;
  let den = 0;
  for (let i = 0; i < bins; i++) {
    for (let j = 0; j < bins; j++) {
      const w = ((i - j) * (i - j)) / denom;
      const e = (histA[i] * histB[j]) / n; // expected under independence
      num += w * O[i][j];
      den += w * e;
    }
  }
  if (den === 0) return NaN; // no disagreement possible => undefined
  return 1 - num / den;
}

function clampInt(x: number, bins: number): number {
  const v = Math.round(x);
  return v < 0 ? 0 : v > bins - 1 ? bins - 1 : v;
}

export interface CalibrationResult {
  /** overall QWK across all (skill, session) pairs that both raters labelled */
  overall: number;
  /** per-skill QWK (NaN when < 2 shared labels for that skill) */
  bySkill: Record<string, number>;
  pairs: number;
  /** gate readiness */
  showScores: boolean; // overall >= 0.6
  driveAssignment: boolean; // overall >= 0.7
}

/**
 * Given aligned {skillId, tracerQuality, goldQuality} rows, compute overall +
 * per-skill QWK and the gate flags. `bins` controls ordinal granularity.
 */
export function calibrate(
  rows: { skillId: string; tracer: number; gold: number }[],
  bins = 5,
): CalibrationResult {
  const A = rows.map((r) => toBucket(r.tracer, bins));
  const B = rows.map((r) => toBucket(r.gold, bins));
  const overall = quadraticWeightedKappa(A, B, bins);

  const bySkill: Record<string, number> = {};
  const groups = new Map<string, { a: number[]; b: number[] }>();
  for (let i = 0; i < rows.length; i++) {
    const g = groups.get(rows[i].skillId) ?? { a: [], b: [] };
    g.a.push(A[i]);
    g.b.push(B[i]);
    groups.set(rows[i].skillId, g);
  }
  for (const [skillId, g] of groups) {
    bySkill[skillId] = g.a.length >= 2 ? quadraticWeightedKappa(g.a, g.b, bins) : NaN;
  }

  return {
    overall,
    bySkill,
    pairs: rows.length,
    showScores: Number.isFinite(overall) && overall >= 0.6,
    driveAssignment: Number.isFinite(overall) && overall >= 0.7,
  };
}
