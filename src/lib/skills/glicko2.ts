// src/lib/skills/glicko2.ts
//
// Glicko-2 (Glickman, 2013) — pure, dependency-free. Used to track each
// candidate's rating on every micro-skill in the taxonomy: one "match" per
// skill observation extracted from a session, opponent = the case's difficulty
// for that skill, score = how well they demonstrated it (0..1).
//
// PRD v3.1 Stage 1 init: rating 1500, RD 350, volatility 0.06.
//
// This file knows nothing about skills or transcripts — it's the raw algorithm.
// The skill-specific mapping (difficulty -> opponent rating, quality -> score)
// lives in src/lib/skills/apply.ts.

export interface Rating {
  rating: number;
  rd: number;
  vol: number;
}

export interface Match {
  opponentRating: number;
  opponentRd: number;
  /** Outcome in [0,1]: 1 = fully demonstrated, 0 = clear miss, partial in between. */
  score: number;
}

export const DEFAULT_RATING: Rating = { rating: 1500, rd: 350, vol: 0.06 };

// System constant tau: constrains how much volatility can change per period.
// 0.5 is the canonical default; lower = more stable. Skill ratings should not
// swing wildly on one noisy session, so we stay at the standard.
const TAU = 0.5;
const SCALE = 173.7178; // Glicko-2 <-> Glicko rating-scale conversion
const EPSILON = 0.000001;
// Never let RD grow past the initial "no information" value.
const MAX_RD = 350;
// Floor so a well-established skill still moves a little on new evidence.
const MIN_RD = 30;

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function expectedScore(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Rate a player against a batch of matches (one rating period).
 * With zero matches, the rating is unchanged and RD grows toward MAX_RD
 * (uncertainty increases when a skill hasn't been exercised).
 */
export function rate(player: Rating, matches: Match[], tau = TAU): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = clampRd(player.rating, player.rd).rd / SCALE;
  const sigma = player.vol;

  if (matches.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return finalize(mu, phiStar, sigma);
  }

  const ms = matches.map((m) => {
    const muJ = (m.opponentRating - 1500) / SCALE;
    const phiJ = m.opponentRd / SCALE;
    const e = expectedScore(mu, muJ, phiJ);
    return { gPhiJ: g(phiJ), e, score: clamp01(m.score) };
  });

  // v: estimated variance of the team's/player's rating based only on outcomes
  let vInv = 0;
  for (const m of ms) vInv += m.gPhiJ * m.gPhiJ * m.e * (1 - m.e);
  const v = 1 / vInv;

  // delta: estimated improvement in rating
  let sum = 0;
  for (const m of ms) sum += m.gPhiJ * (m.score - m.e);
  const delta = v * sum;

  // --- new volatility via the Illinois (regula falsi) algorithm ---
  const a = Math.log(sigma * sigma);
  const phi2 = phi * phi;
  const delta2 = delta * delta;

  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta2 - phi2 - v - ex);
    const den = 2 * (phi2 + v + ex) * (phi2 + v + ex);
    return num / den - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  let guard = 0;
  while (Math.abs(B - A) > EPSILON && guard < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    guard += 1;
  }
  const sigmaPrime = Math.exp(A / 2);

  // --- new RD and rating ---
  const phiStar = Math.sqrt(phi2 + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * sum;

  return finalize(muPrime, phiPrime, sigmaPrime);
}

function finalize(mu: number, phi: number, vol: number): Rating {
  const rating = SCALE * mu + 1500;
  const rd = SCALE * phi;
  return clampRd(rating, rd, vol);
}

function clampRd(rating: number, rd: number, vol = DEFAULT_RATING.vol): Rating {
  return {
    rating: round(rating, 2),
    rd: round(Math.min(MAX_RD, Math.max(MIN_RD, rd)), 2),
    vol: round(vol, 6),
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function round(x: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

/**
 * A single conservative point estimate of skill level for display / ranking:
 * the lower bound of an ~68% confidence interval (rating - RD). Rewards
 * consistent evidence, not one lucky session.
 */
export function conservativeEstimate(r: Rating): number {
  return round(r.rating - r.rd, 1);
}
