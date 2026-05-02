// Type definitions for the /math-drill engine question pool.
// Each Q is one solve-it-in-your-head problem that mimics real
// case-interview / sourcing-call / partner-grilling math pressure.
//
// Authoring contract (enforced by reviewer, not the type system):
//  - question must read like a real business problem, not "x + y"
//  - answer is a single numeric — currency / units stripped
//  - tolerance must be calibrated: tighter at L1, looser at L4 (estimation)
//  - explanation gives the *mental shortcut*, not the full algebraic steps
//  - common_trap calls out the realistic mistake students make under pressure

export type DrillLevel = 1 | 2 | 3 | 4;

export type DrillTrack =
  | 'consulting'   // MBB / Big-4 / strategy — sizing, margin, growth
  | 'ib_pe_vc'     // banking + buyside — DCF, LBO, IRR, accretion
  | 'pm'           // product management — funnels, retention, LTV, A/B
  | 'marketing'    // brand / growth — CAC, MROI, attribution, elasticity
  | 'all';         // generic mental-math primitives that apply everywhere

export type Q = {
  level: DrillLevel;
  track: DrillTrack;
  topic: string;          // short topic tag e.g. "CAGR", "WACC", "Funnel"
  question: string;       // the prompt the student sees
  answer: number;         // the canonical numeric answer
  tolerance: number;      // absolute ± window; 0 means exact match required
  explanation: string;    // 1-2 line shortcut / why-the-answer-is-the-answer
  common_trap: string;    // realistic wrong path students fall into
};

// Helper for callers that want to filter the pool ergonomically.
export const isLevel = (q: Q, l: DrillLevel) => q.level === l;
export const isTrack = (q: Q, t: DrillTrack) =>
  q.track === t || q.track === 'all' || t === 'all';
