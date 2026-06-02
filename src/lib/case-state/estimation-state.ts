// src/lib/case-state/estimation-state.ts
//
// Guesstimate / market-sizing engine (Wave 2 lever B). Estimation threads need
// their own state — distinct from the number-registry, whose job is anti-flip-
// flop and which collapses every "%" into one key (so it can't hold a sizing
// chain's distinct building blocks).
//
// This module is PURE and FAIL-SAFE: it reads the transcript and returns a
// lightweight ledger of the candidate's estimation behavior. It makes NO LLM
// calls and NO DB writes. The chat route uses it (fail-open) to feed the
// interviewer the GUESSTIMATE playbook state; the scorer uses its signals to
// grade estimation on STRUCTURE + SANITY-CHECK, never on the final number's
// proximity (per docs/research/interview-dynamics/PLAYBOOKS.md: "the numerical
// answer is the least important part").

import type { CaseType } from '@/lib/groq/walkthrough';
import { findArithmeticError } from './arithmetic-verifier';

type Turn = { role: string; content: string };

export interface EstimationState {
  /** Whether a sizing/estimation thread is active in this session. */
  active: boolean;
  /** Candidate-stated assumptions ("assume ~40% are urban"), in order. */
  assumptions: { text: string; turn: number }[];
  /** Did the candidate lay out a structure/formula before stating a big number? */
  structuredFirst: boolean;
  /** Did the candidate sanity-check the result (per-capita gut check, order of magnitude…)? */
  sanityChecked: boolean;
  /** Did the candidate blurt a big number with no prior structure/assumptions? */
  blurtedNumber: boolean;
  /** Deterministic arithmetic errors in the candidate's own estimation math. */
  arithmeticErrors: { evidence: string }[];
  /** The most recent big number the candidate stated (display only — NOT graded for proximity). */
  finalNumber: string | null;
}

export interface EstimationSignals {
  active: boolean;
  structuredFirst: boolean;
  sanityChecked: boolean;
  blurtedNumber: boolean;
  statedAssumptions: number;
  arithmeticError: boolean;
}

// --- detectors (lenient, never throw) ---------------------------------------

const SIZING_RE =
  /\b(how many|market siz|size the|sizing|estimat|guesstimat|number of|per capita|population|\btam\b|\bsam\b|\bsom\b|market for|fermi)\b/i;

const ASSUMPTION_RE =
  /\b(assume|assuming|let'?s say|let us say|roughly|approximately|approx\b|i'?ll take|i'?ll assume|say (?:about|around|roughly)|ballpark|on average|suppose)\b/i;

const STRUCTURE_RE =
  /(×|\*|\btimes\b|multiply|divid|broken? (?:it )?(?:down|into)|decompos|segment|per (?:person|capita|household|user|day|year|month|customer)|top[- ]?down|bottom[- ]?up|formula|equation|break (?:this|it) (?:down|into))/i;

const SANITY_RE =
  /\b(sanity[- ]?check|gut[- ]?check|does that (?:make sense|seem|look)|seems? (?:high|low|reasonable|right|off|about right)|order of magnitude|reasonable|too (?:high|low|big|small|large)|cross[- ]?check|that feels|feels (?:high|low|right)|ballpark check|divide (?:by|that by))\b/i;

// A "big" number worth treating as a sizing output: a comma-grouped number
// (10,000+) or a number with a scale word (million/k/crore…).
const BIG_NUMBER_RE =
  /(\d{1,3}(?:,\d{3})+)|(\d+(?:\.\d+)?\s*(?:million|billion|trillion|crore|lakh|\bk\b|\bm\b|\bbn\b|mn))/i;

function candidateTurns(transcript: Turn[]): { content: string; turn: number }[] {
  if (!Array.isArray(transcript)) return [];
  const out: { content: string; turn: number }[] = [];
  transcript.forEach((t, i) => {
    if (t && t.role === 'user' && typeof t.content === 'string') {
      out.push({ content: t.content, turn: i });
    }
  });
  return out;
}

/**
 * Is a sizing/estimation thread active? True for estimation-typed cases, or
 * when the recent conversation shows sizing language. Pure + total.
 */
export function detectEstimationThread(
  transcript: Turn[],
  opts: { caseType?: CaseType | null; isEstimation?: boolean } = {}
): boolean {
  if (opts.isEstimation || opts.caseType === 'estimation') return true;
  const recent = candidateTurns(transcript).slice(-4).map((t) => t.content).join('\n');
  return SIZING_RE.test(recent);
}

/**
 * Extract the estimation ledger from the transcript. Pure + total: malformed
 * input yields an inactive, empty state rather than throwing.
 */
export function extractEstimationState(
  transcript: Turn[],
  opts: { caseType?: CaseType | null; isEstimation?: boolean } = {}
): EstimationState {
  const empty: EstimationState = {
    active: false,
    assumptions: [],
    structuredFirst: false,
    sanityChecked: false,
    blurtedNumber: false,
    arithmeticErrors: [],
    finalNumber: null,
  };

  const turns = candidateTurns(transcript);
  const active = detectEstimationThread(transcript, opts);
  if (!active || turns.length === 0) return { ...empty, active };

  const assumptions: { text: string; turn: number }[] = [];
  const arithmeticErrors: { evidence: string }[] = [];
  let sanityChecked = false;
  let firstNumberTurnIdx = -1; // index INTO `turns` of the first big-number turn
  let firstStructureTurnIdx = -1;
  let firstAssumptionTurnIdx = -1;
  let finalNumber: string | null = null;

  turns.forEach((t, idx) => {
    const c = t.content;
    if (ASSUMPTION_RE.test(c)) {
      if (firstAssumptionTurnIdx === -1) firstAssumptionTurnIdx = idx;
      // capture a short snippet around the assumption cue for the ledger
      assumptions.push({ text: firstSentence(c), turn: t.turn });
    }
    if (STRUCTURE_RE.test(c) && firstStructureTurnIdx === -1) firstStructureTurnIdx = idx;
    if (SANITY_RE.test(c)) sanityChecked = true;
    const bn = c.match(BIG_NUMBER_RE);
    if (bn) {
      if (firstNumberTurnIdx === -1) firstNumberTurnIdx = idx;
      finalNumber = bn[0].trim();
    }
    const err = findArithmeticError(c);
    if (err) arithmeticErrors.push({ evidence: err.evidence });
  });

  // structuredFirst: a structure (or assumptions) was laid out at or before the
  // first big number. If no big number yet, having any structure counts.
  const structureIdx = minNonNeg(firstStructureTurnIdx, firstAssumptionTurnIdx);
  const structuredFirst =
    structureIdx !== -1 &&
    (firstNumberTurnIdx === -1 || structureIdx <= firstNumberTurnIdx);

  // blurtedNumber: a big number appeared with NO structure/assumptions at or
  // before it — the candidate jumped to a number (the canonical guesstimate fail).
  const blurtedNumber =
    firstNumberTurnIdx !== -1 &&
    (structureIdx === -1 || structureIdx > firstNumberTurnIdx);

  return {
    active: true,
    assumptions: assumptions.slice(0, 8),
    structuredFirst,
    sanityChecked,
    blurtedNumber,
    arithmeticErrors,
    finalNumber,
  };
}

function minNonNeg(a: number, b: number): number {
  const xs = [a, b].filter((n) => n >= 0);
  return xs.length ? Math.min(...xs) : -1;
}

function firstSentence(s: string): string {
  const trimmed = s.trim().replace(/\s+/g, ' ');
  const m = trimmed.match(/^.{0,160}?[.!?](?:\s|$)/);
  return (m ? m[0] : trimmed.slice(0, 160)).trim();
}

/**
 * Compact prompt block fed to the interviewer when a sizing thread is active.
 * Tells it the candidate's current estimation behavior so it can apply the
 * GUESSTIMATE playbook (demand the logic, don't hand values, force a sanity
 * check, catch a blurted number). Returns '' when not active.
 */
export function renderEstimationStateBlock(state: EstimationState): string {
  if (!state.active) return '';
  const lines: string[] = ['== ESTIMATION STATE (this is a sizing thread — apply the guesstimate playbook) =='];
  lines.push(`Structured before numbers: ${state.structuredFirst ? 'yes' : 'no'}`);
  lines.push(`Sanity-checked the result: ${state.sanityChecked ? 'yes' : 'no'}`);
  if (state.assumptions.length) {
    lines.push(`Assumptions on the table (${state.assumptions.length}):`);
    for (const a of state.assumptions.slice(0, 5)) lines.push(`  - ${a.text}`);
  } else {
    lines.push('Assumptions stated so far: none — they have not made their reasoning explicit.');
  }
  if (state.finalNumber) lines.push(`Latest number stated: ${state.finalNumber}`);

  const nudges: string[] = [];
  if (state.blurtedNumber) {
    nudges.push(
      'They jumped to a number without structuring first — do NOT accept it. Demand the logic: "What is the logic behind that number? Walk me through how you got there."'
    );
  }
  if (state.finalNumber && !state.sanityChecked) {
    nudges.push(
      'They have a number but never sanity-checked it — push for a gut check: "Does that feel right? Collapse it to a per-capita / per-household number and tell me if it holds."'
    );
  }
  if (!state.assumptions.length && !state.blurtedNumber) {
    nudges.push('They have not stated assumptions — make them state each driver and its value out loud before computing.');
  }
  if (state.arithmeticErrors.length) {
    nudges.push(`Their arithmetic is off: ${state.arithmeticErrors[0].evidence}. Make them re-check it themselves — do not hand them the answer.`);
  }
  if (nudges.length) {
    lines.push('DO THIS NOW:');
    for (const n of nudges) lines.push(`  - ${n}`);
  }
  // Reminder of the scoring stance so the interviewer rewards the right thing.
  lines.push(
    'Remember: grade the STRUCTURE, assumptions, and sanity-check — NOT how close the final number is. A defensibly-wrong number with sound process beats a lucky exact guess.'
  );
  return '\n\n' + lines.join('\n');
}

/** Signals for the scorer. Pure projection of the state. */
export function estimationSignals(state: EstimationState): EstimationSignals {
  return {
    active: state.active,
    structuredFirst: state.structuredFirst,
    sanityChecked: state.sanityChecked,
    blurtedNumber: state.blurtedNumber,
    statedAssumptions: state.assumptions.length,
    arithmeticError: state.arithmeticErrors.length > 0,
  };
}
