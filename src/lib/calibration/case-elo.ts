// src/lib/calibration/case-elo.ts
//
// Case difficulty calibration (PRD v3.1 Stage 4 — the "self-improvement
// flywheel", IRT/Elo half). Every completed session is a match between the
// candidate's implied skill and the case's difficulty rating; the outcome is
// the normalised score. If strong candidates keep scoring low on a case its
// rating rises; if weak candidates ace it, it falls.
//
// This does NOT touch the `cases` corpus or the displayed easy/medium/hard
// label — it writes a side `case_calibration` row that an admin reviews. The
// corpus stays sacred.
//
// Pure. The DB read/write lives in src/lib/calibration/apply.ts.

export interface CaseRating {
  rating: number;
  /** rough uncertainty: shrinks as plays accrue, widens K while young. */
  rd: number;
  plays: number;
}

export const DEFAULT_CASE_RATING: CaseRating = { rating: 1500, rd: 350, plays: 0 };
const MIN_RD = 60;

/** K-factor: aggressive while the case is young, calm once it has a history. */
export function kFactor(plays: number): number {
  if (plays < 10) return 40;
  if (plays < 30) return 24;
  return 14;
}

/** Expected chance the CANDIDATE "beats" the case (scores well). */
export function expectedCandidateWin(candidateRating: number, caseRating: number): number {
  return 1 / (1 + 10 ** ((caseRating - candidateRating) / 400));
}

/**
 * One update. `score01` is the session score normalised to [0,1].
 * candidateRating defaults to 1500 (an untracked candidate).
 */
export function updateCaseRating(
  current: CaseRating,
  score01: number,
  candidateRating = 1500,
): CaseRating {
  const s = score01 < 0 ? 0 : score01 > 1 ? 1 : score01;
  const e = expectedCandidateWin(candidateRating, current.rating);
  const k = kFactor(current.plays);
  // Case "result" is (1 - s); its expectation is (1 - e). delta = k * (e - s):
  // candidate over-performs (s > e)  -> rating down (case was easier than rated)
  // candidate under-performs (s < e) -> rating up.
  const next = current.rating + k * (e - s);
  const rd = Math.max(MIN_RD, current.rd * 0.94);
  return {
    rating: Math.round(next * 100) / 100,
    rd: Math.round(rd * 100) / 100,
    plays: current.plays + 1,
  };
}

/**
 * Map a calibrated rating back to a display band, so an admin can see where
 * the corpus label and the empirical difficulty disagree. NOT applied
 * automatically.
 */
export function bandFor(rating: number): 'easy' | 'medium' | 'hard' {
  if (rating < 1440) return 'easy';
  if (rating < 1600) return 'medium';
  return 'hard';
}

/** How far a calibrated rating has drifted from where its label implies it
 *  should sit (label midpoints: easy 1380, medium 1520, hard 1680). */
export function labelDrift(rating: number, label: string): number {
  const mid = label === 'easy' ? 1380 : label === 'hard' ? 1680 : 1520;
  return Math.round(rating - mid);
}
