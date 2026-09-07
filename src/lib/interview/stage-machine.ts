// src/lib/interview/stage-machine.ts
//
// The interviewer STAGE MACHINE. Real case interviews move through a known arc
// (scope → structure → analyse → quant → synthesise → recommend → wrap). The
// old engine had no stage concept at all — it only counted transcript length
// and relied on prose like "force a synthesis at 8+ turns" that nothing
// actually enforced (interviewer.ts:69, route.ts:323).
//
// This module makes the stage DETERMINISTIC and pure: the current stage is a
// function of the transcript, recomputed every turn. No DB column, no drift,
// no new failure surface in the never-fail NSM. If anything here ever throws,
// the caller treats stage as null and the engine behaves exactly as it did
// before — so this can only ADD signal, never break a turn. (FORTRESS.)
//
// `quant` is the hook where the guesstimate engine (Wave 2 lever B) will plug
// in as a specialised mode — the machine already routes estimation threads
// here, so B becomes "make the quant stage smarter" rather than a new fork.

import type { Track } from '@/lib/tracks';
import type { CaseType } from '@/lib/groq/walkthrough';
import { stageNoteFor } from './track-playbooks';

export type Stage =
  | 'scoping' // clarifying the prompt, understanding the objective
  | 'structure' // laying out the framework / issue tree
  | 'analysis' // working a branch, exchanging data, testing hypotheses
  | 'quant' // an active math / estimation thread (guesstimate mode hooks here)
  | 'brainstorm' // one creativity beat before the close ("what else could explain this?")
  | 'synthesis' // pulling the findings together
  | 'recommendation' // the bottom-line answer to the decision-maker
  | 'wrap'; // candidate questions + close

// Interviewer-led (McKinsey/Strategy&/Accenture): the interviewer fires the
// next scripted sub-question and redirects a floundering candidate so the case
// still completes. Candidate-led (BCG/Bain/Deloitte/LEK/OW/Kearney/Berger and
// the club casebooks written in their style): the candidate drives, the
// interviewer is reactive and releases data only on request, no rescue.
// Ref: docs/research/interview-mechanics.md A.11.
export type InterviewFormat = 'interviewer_led' | 'candidate_led';

export interface StageContext {
  track: Track;
  caseType: CaseType;
  /** True for pure market-sizing / guesstimate cases — biases toward quant. */
  isEstimation: boolean;
  /**
   * Wall-clock minutes elapsed since the interview started. When provided, the
   * drive-to-close and the scoping-exit are gated on TIME, not turn count.
   * This matters for VOICE: a spoken turn is a fraction of a typed one, so a
   * turn-count-only close fires ~3x too early in a live interview ("demanded
   * the recommendation 5 minutes in"). Undefined → falls back to turn counts
   * exactly as before the clock existed. Fail-open: NaN/negative is ignored.
   */
  elapsedMin?: number;
  /** Total case length in minutes. Default 25. The forced synthesis will not
   *  fire before ~80% of this has elapsed when a clock is present. */
  limitMin?: number;
  /**
   * Interviewer-led vs candidate-led. Shapes how hard the machine drives:
   * candidate-led gives a longer scoping/structure leash and one softer nudge
   * instead of a redirect. Undefined → treated as interviewer_led (the
   * pre-format behavior), so callers that don't set it are unaffected.
   */
  format?: InterviewFormat;
}

export interface StageState {
  stage: Stage;
  /** 1-based index of the candidate turn we're responding to. */
  candidateTurns: number;
  /** Deterministic signals that produced the stage (useful for tests + debug). */
  signals: StageSignals;
}

export interface StageSignals {
  hasStructure: boolean;
  mathActive: boolean;
  hasSynthesis: boolean;
  hasRecommendation: boolean;
  nearEnd: boolean;
  /** The candidate's recent turns are still clarifying the prompt (asking
   *  questions / pinning the objective) and no structure is up yet — keep
   *  them in scoping instead of evicting on a turn count. */
  stillClarifying: boolean;
  /** Mid-to-late in the case, a structure is up, and the interviewer hasn't
   *  run a creativity beat yet — route one brainstorm turn before the close. */
  readyForBrainstorm: boolean;
}

type Turn = { role: string; content: string };

// When there's NO clock (text sessions that don't pass elapsedMin, or a
// malformed transcript), fall back to this: after this many candidate turns
// with no synthesis, the interviewer deterministically drives the close.
// A typed turn is ~2 min, so 9 turns ≈ a full case. Real EMs interrupt
// overlong analysis to land a recommendation.
const CLOSE_TURN = 9;

// With a clock, the forced "tell me your answer now" cannot fire before this
// fraction of the case has elapsed — regardless of how many quick turns went
// by. A voice interview can rack up 9 turns in 5 minutes; forcing a synthesis
// there is itself an interviewer error. 0.8 because a real case spends ~65% of
// the time in analysis and only the last ~5% (1-2 min of a 25-min case) on the
// recommendation — see the timing skeleton in docs/research/interview-mechanics.
const CLOSE_ELAPSED_FRACTION = 0.8;

// Default case length when the caller doesn't pass one.
const DEFAULT_LIMIT_MIN = 25;

// ---- signal detectors (lenient, never throw) --------------------------------

const STRUCTURE_RE =
  /\b(framework|structure|i'?d (?:break|split|divide|bucket|segment)|buckets?|mece|issue tree|three (?:areas|buckets|things)|drivers?|first(?:ly)?,?\s+.*second(?:ly)?|on (?:the )?(?:revenue|cost) side|two (?:angles|lenses|dimensions))\b/i;

const MATH_RE =
  /(\d[\d,.]*\s*(?:%|percent|million|mn|bn|billion|k\b|crore|lakh|x\b))|(\d[\d,.]*\s*[×x*/÷+\-]\s*\d)|\b(?:roughly|approximately|estimate|assume|let'?s say|multiply|divide|times|per (?:user|customer|year|month|day|capita))\b/i;

const SYNTHESIS_RE =
  /\b(in summary|to summari[sz]e|to synthesi[sz]e|bottom line|bottom-line|my recommendation|i'?d recommend|the (?:answer|takeaway) is|so (?:the|my) answer|stepping back,? (?:the|my)|net[- ]net|in short|if i had to (?:tell|sum)|pulling (?:this|it) together)\b/i;

const RECOMMENDATION_RE =
  /\b(i recommend|my recommendation is|we should (?:enter|launch|acquire|exit|raise|cut|invest|not)|the company should|i'?d (?:advise|tell the (?:ceo|client)))\b/i;

// The candidate is still SCOPING — restating the prompt, asking what we're
// solving for, pinning the objective / timeframe / constraints. A clarifying
// question doesn't trip STRUCTURE_RE, so without this the machine evicts them
// into the "structure" stage after two turns and the interviewer starts
// demanding a framework mid-question. Matches a literal question mark or the
// vocabulary of scoping.
const CLARIFY_RE =
  /\?|\b(what (?:are|is|does|would|exactly)|which|how (?:much|many|long|do)|why (?:are|is|do)|clarif|the objective|our goal|time ?frame|time horizon|success (?:look|mean|defined)|what.s the (?:goal|target|scope|context)|are we (?:trying|looking|solving)|is (?:this|the) (?:a|the)|do we (?:have|know|care)|any (?:constraints|context|targets)|can you (?:tell|share|give) me)\b/i;

// An interviewer turn that has ALREADY run the creativity beat — once this is
// seen we stop routing to 'brainstorm' and fall back to analysis → synthesis.
const BRAINSTORM_ASKED_RE =
  /\b(what else|anything else|other (?:explanations?|reasons?|factors?|causes?|ways|drivers?|ideas?|options?)|any other|what other|brainstorm|besides (?:that|those|this)|can you think of (?:any )?other|all the ways)\b/i;

// The candidate's turn shows no forward progress — explicit stuck language.
// Paired with a short-turn / no-new-content check in assessStuck().
const STUCK_RE =
  /\b(i'?m not sure|i am not sure|not sure (?:where|how|what|which|about)|i don'?t know|i have no idea|no idea|drawing a blank|i'?m stuck|i am stuck|can you help|give me a hint|a hint\??$|where (?:should|do) i (?:start|go|begin)|what should i (?:do|look at|consider)|not sure where to (?:go|start|begin)|i'?m lost|feeling lost|blanking)\b/i;

// Firms / casebooks that run INTERVIEWER-LED cases. Everything else (and an
// unknown source) is treated as candidate-led — the majority, and the format
// whose "let the candidate drive" feel was the thing missing.
const INTERVIEWER_LED_RE =
  /\bmckinsey\b|\bmck\b|strategy\s?&|strategy and|accenture strategy|diamondcluster|monitor deloitte/i;

function textOfCandidate(transcript: Turn[]): string {
  return transcript
    .filter((t) => t && t.role === 'user' && typeof t.content === 'string')
    .map((t) => t.content)
    .join('\n');
}

function textOfInterviewer(transcript: Turn[]): string {
  return transcript
    .filter(
      (t) =>
        t &&
        (t.role === 'interviewer' || t.role === 'assistant') &&
        typeof t.content === 'string'
    )
    .map((t) => t.content)
    .join('\n');
}

function recentCandidateText(transcript: Turn[], n: number): string {
  const userTurns = transcript.filter(
    (t) => t && t.role === 'user' && typeof t.content === 'string'
  );
  return userTurns
    .slice(-n)
    .map((t) => t.content)
    .join('\n');
}

export function candidateTurnCount(transcript: Turn[]): number {
  if (!Array.isArray(transcript)) return 0;
  return transcript.filter((t) => t && t.role === 'user').length;
}

/**
 * Compute the current interview stage from the transcript. Pure + total:
 * any malformed input yields a safe default ('scoping') rather than throwing.
 */
export function inferStage(transcript: Turn[], ctx: StageContext): StageState {
  const safe = Array.isArray(transcript) ? transcript : [];
  const candidateTurns = candidateTurnCount(safe);

  const allCandidate = textOfCandidate(safe);
  const recentText = recentCandidateText(safe, 3);
  const allInterviewer = textOfInterviewer(safe);

  // Clock (fail-open): only trust a finite, non-negative elapsed reading.
  const limitMin =
    typeof ctx.limitMin === 'number' && ctx.limitMin > 0 ? ctx.limitMin : DEFAULT_LIMIT_MIN;
  const hasClock =
    typeof ctx.elapsedMin === 'number' && isFinite(ctx.elapsedMin) && ctx.elapsedMin >= 0;
  const elapsedMin = hasClock ? (ctx.elapsedMin as number) : null;
  // Absent format → interviewer_led (pre-format behavior; callers opt in).
  const format: InterviewFormat = ctx.format === 'candidate_led' ? 'candidate_led' : 'interviewer_led';

  const hasStructure = STRUCTURE_RE.test(allCandidate);

  // Drive-to-close. With a clock: CLOSE_ELAPSED_FRACTION of the case elapsed,
  // or a runaway turn count as a backstop for a pathological fast-rambler.
  // Without a clock: the original turn-count rule, unchanged.
  const nearEnd =
    elapsedMin !== null
      ? elapsedMin >= limitMin * CLOSE_ELAPSED_FRACTION || candidateTurns >= CLOSE_TURN * 2
      : candidateTurns >= CLOSE_TURN;

  // Still scoping: no structure up yet AND the recent turns read as clarifying.
  const stillClarifying = !hasStructure && CLARIFY_RE.test(recentText);

  // One creativity beat: structure is up, we're mid-to-late but not yet at the
  // close, and the interviewer hasn't asked "what else" yet.
  const midLate =
    elapsedMin !== null
      ? elapsedMin >= limitMin * 0.5 && elapsedMin < limitMin * CLOSE_ELAPSED_FRACTION
      : candidateTurns >= 5 && candidateTurns < CLOSE_TURN;
  const readyForBrainstorm =
    hasStructure && midLate && !nearEnd && !BRAINSTORM_ASKED_RE.test(allInterviewer);

  const signals: StageSignals = {
    hasStructure,
    mathActive: MATH_RE.test(recentText),
    hasSynthesis: SYNTHESIS_RE.test(allCandidate),
    hasRecommendation: RECOMMENDATION_RE.test(allCandidate),
    nearEnd,
    stillClarifying,
    readyForBrainstorm,
  };

  const stage = pickStage(candidateTurns, signals, elapsedMin, limitMin, format);
  return { stage, candidateTurns, signals };
}

function pickStage(
  candidateTurns: number,
  s: StageSignals,
  elapsedMin: number | null,
  limitMin: number,
  format: InterviewFormat
): Stage {
  // Opening: the candidate hasn't said anything substantive yet.
  if (candidateTurns === 0) return 'scoping';

  // Late-arc states win — once the candidate has landed a recommendation we're
  // wrapping up; if they've synthesised, push them to commit the recommendation.
  if (s.hasRecommendation) return 'wrap';
  if (s.hasSynthesis) return 'recommendation';

  // Drive-to-close: past the close threshold with no synthesis yet → the
  // interviewer forces the synthesis. Time-gated when a clock is present (see
  // inferStage) so a fast voice interview isn't rushed to a recommendation.
  if (s.nearEnd) return 'synthesis';

  // Mid-case: an active math/estimation thread routes to quant (guesstimate
  // mode hooks here). Pure-estimation cases bias here as soon as numbers start.
  if (s.mathActive) return 'quant';

  // One creativity beat before the close — see readyForBrainstorm in
  // inferStage. Falls back to analysis the moment the interviewer has run it.
  if (s.readyForBrainstorm) return 'brainstorm';

  // Estimation cases that haven't started numbers yet still belong in structure
  // first (decompose before you compute) — handled by the structure branch.
  if (s.hasStructure) return 'analysis';

  // Very early, no structure yet → still scoping.
  if (candidateTurns <= 1) return 'scoping';

  // The candidate is still clarifying the prompt and hasn't structured. Give
  // them a real scoping window (2-3 questions over 1-3 min is the norm;
  // docs/research/interview-mechanics.md A.4) before evicting them into
  // "structure". Candidate-led cases get a longer leash — the candidate owns
  // the flow there. A clarifying question shouldn't cost you the scoping phase.
  const scopingCapMin =
    format === 'candidate_led' ? Math.min(6, limitMin * 0.2) : Math.min(5, limitMin * 0.15);
  const scopingCapTurns = format === 'candidate_led' ? 4 : 3;
  const scopingBudgetOver =
    elapsedMin !== null ? elapsedMin >= scopingCapMin : candidateTurns >= scopingCapTurns;
  if (s.stillClarifying && !scopingBudgetOver) return 'scoping';

  // Default mid-state: they're talking but haven't committed a structure.
  return 'structure';
}

// ---- per-stage interviewer directives --------------------------------------

/**
 * The behavioural directive injected into the system prompt for the current
 * stage. Tells the interviewer what to drive THIS stage + the exit criteria,
 * and references the track's graded dimensions so the live experience matches
 * the rubric it's scored against. Kept short — the base prompt is already large.
 */
export function stageDirective(stage: Stage, ctx: StageContext): string {
  const base = baseStageDirective(stage, ctx);
  // Append track-specific, research-grounded guidance for this stage (real
  // interviewer behavior per track). Fail-safe: returns '' when none applies.
  let note = '';
  try {
    note = stageNoteFor(ctx.track, stage, ctx.isEstimation);
  } catch {
    note = '';
  }
  return note ? `${base}\n${note}` : base;
}

function baseStageDirective(stage: Stage, ctx: StageContext): string {
  const head = `== CURRENT STAGE: ${stage.toUpperCase()} ==`;
  switch (stage) {
    case 'scoping':
      return `${head}
This is L0 — the question, no structure yet. Let them ask clarifying questions and restate the objective (goal, timeframe, constraints). Do NOT feed analysis or hand them a structure. If they jump straight to a framework — or worse, straight to L3/L4 detail — pull them back: "Before structure — what are we actually solving for?" Give L0 two to three minutes: let them restate the objective and ask their clarifying questions before you push for structure — a good candidate scopes first, and rushing them out of it is your error, not theirs. Do push if they're still here with nothing pinned down past four or five minutes. Advance them once they've grasped the objective and started to structure.`;
    case 'structure':
      return `${head}
This is L1→L2 — big buckets, then one layer of drivers. Push for a SPECIFIC, case-fit structure with a hypothesis — not a memorised template. The L1 cut should fit on one line; pressure-test MECE and "why these buckets?". L2 drivers are baseline anatomy, not the differentiator — don't let them linger reciting; this whole stage is three or four minutes. Do NOT release data yet and do NOT analyse for them. If they dive to L4 sub-drivers before committing buckets, name the altitude jump and send them back up. Advance once they've committed a prioritised structure and named where they'd start — and make them justify WHY that branch first.`;
    case 'analysis':
      return `${head}
This is L3 — case-specific drivers, the level where scoring actually starts and where the bulk of the case belongs. Release gated data only when their question matches a reveal trigger, then demand they BEND THE TREE to it: every number gets a "so what does that do to your structure?", not just an interpretation. Grill recitation — if they respond to case data with generic L2 anatomy, call it ("that's the textbook — what does MY number change?"). Watch elasticity: pull them up if they lose the top-line thread, and check they confirmed the branch matters before going deep on it. Push toward the quantitative core when one exists.`;
    case 'quant':
      return `${head}
There's a live ${ctx.isEstimation ? 'estimation/sizing' : 'math'} thread — this is L4 territory: numbers specific enough to test. Make them state assumptions explicitly and sanity-check the result (order of magnitude, ±range). Do NOT do the arithmetic for them. If they hand-wave the math, call it. Once the number is defended, make them zoom back out: "so what does that tell us about the overall answer?" and move toward synthesis.`;
    case 'brainstorm':
      return `${head}
One creativity beat before the close. Ask for breadth ONCE — "What else could explain this?" or "What are all the ways the client could get there?" — then let them run. You want 2-4 case-specific, non-obvious ideas that are grouped (internal vs external, demand vs supply, short vs long term), not a scramble of fifteen generic ones. Reward structure and relevance over volume. Keep it to one round, then push toward synthesis — do not let brainstorming become the case.`;
    case 'synthesis':
      return `${head}
Time to land it. If they haven't synthesised, force it now: "If you had to tell the CEO your answer right now, what is it?" Demand a top-down, bottom-line-first summary that ties to the objective — not a recap of what you discussed. Reject a chronological replay; push for the SO-WHAT.`;
    case 'recommendation':
      return `${head}
They've synthesised — now get a crisp recommendation with the headline first, the 2-3 reasons, and the main risk/next step. Stress-test it once ("what would change your mind?" or a quick objection). Then move to close.`;
    case 'wrap':
      return `${head}
The case is essentially solved. Acknowledge briefly (no gushing), optionally probe one loose end or risk, then invite their questions and close cleanly. Do NOT reopen the whole case.`;
    default:
      return head;
  }
}

// ---- interview format (interviewer-led vs candidate-led) -------------------

/**
 * Derive the format from the case's `source`. McKinsey-family sources run
 * interviewer-led; everything else — and an unknown/empty source — is
 * candidate-led (the majority, and the "let the candidate drive" feel that
 * was missing). Total + fail-safe. Ref: docs/research/interview-mechanics.md A.11.
 */
export function inferInterviewFormat(source: string | null | undefined): InterviewFormat {
  try {
    return source && INTERVIEWER_LED_RE.test(source) ? 'interviewer_led' : 'candidate_led';
  } catch {
    return 'candidate_led';
  }
}

/** A short system-prompt block establishing who drives the case. Injected once
 *  per turn alongside the stage directive. */
export function formatDirective(format: InterviewFormat): string {
  if (format === 'candidate_led') {
    return `== FORMAT: CANDIDATE-LED (BCG / Bain style) ==
The CANDIDATE drives. After the prompt, let them play it back and ask their clarifying questions, then let them present a full structure and decide what to explore first. You are REACTIVE: release gated data only when they ask a question that reaches it; otherwise "what would you assume, and why?". Do NOT hand them the next bucket or the next step. If their structure is weak, ask ONE sharpening question, then let them proceed — no rescue-by-redirect, they can stay lost. Keep your turns short; interject to challenge a claim or a number, not to steer. Slower and more conversational than a McKinsey case.`;
  }
  return `== FORMAT: INTERVIEWER-LED (McKinsey style) ==
YOU drive. Take their structure briefly, then run your own sequence of sub-questions in order. If they flounder, redirect to the next question so the case still completes — never let it stall out. Fast, high-pressure, bite-sized. Still make them volunteer hypotheses and synthesize unprompted.`;
}

// ---- hint ladder ----------------------------------------------------------

export type HintLevel = 0 | 1 | 2 | 3;

/**
 * How stuck the candidate is right now: the run length of their most recent
 * consecutive turns that show no forward progress — explicit stuck language,
 * or a very short turn with no new structure / math / reasoning. Capped at 3,
 * which is also the hint level. Pure + total.
 */
export function assessStuck(transcript: Turn[]): { level: HintLevel; runLength: number } {
  const safe = Array.isArray(transcript) ? transcript : [];
  const userTurns = safe.filter(
    (t) => t && t.role === 'user' && typeof t.content === 'string'
  );
  let run = 0;
  for (let k = userTurns.length - 1; k >= 0; k--) {
    const c = (userTurns[k].content || '').trim();
    const words = c ? c.split(/\s+/).length : 0;
    const noProgress =
      !c ||
      STUCK_RE.test(c) ||
      (words < 12 &&
        !STRUCTURE_RE.test(c) &&
        !MATH_RE.test(c) &&
        !/\bbecause\b|\bhypothes|\bso what\b/i.test(c));
    if (noProgress) run++;
    else break;
  }
  const level = (run > 3 ? 3 : run) as HintLevel;
  return { level, runLength: run };
}

/**
 * The hint-ladder directive for the current stuck level. Empty when not stuck.
 * Candidate-led caps at rung 2 (directional) — no rescue there; interviewer-led
 * may reach rung 3 (structural, then supply the step) as a last resort so the
 * case still completes. Ref: docs/research/interview-mechanics.md E.3.
 */
export function hintDirective(level: HintLevel, format: InterviewFormat): string {
  if (level <= 0) return '';
  const cap: HintLevel = format === 'candidate_led' ? 2 : 3;
  const eff = (level < cap ? level : cap) as Exclude<HintLevel, 0>;
  const rung: Record<Exclude<HintLevel, 0>, string> = {
    1: 'NUDGE only — an implicit question ("What would you expect to see here?" / "Is there another angle?"). Do not point at the answer.',
    2: 'DIRECTIONAL hint — name the area to look at ("think about the cost side specifically" / "you have volume — what else do you need for revenue?"), not the step itself.',
    3: 'STRUCTURAL hint — give the missing cut ("break this into fixed vs variable"). If they are still stuck the next turn, supply that one step and move on, and note the assist. Last resort.',
  };
  return `== CANDIDATE IS STUCK (${level} turn${level === 1 ? '' : 's'} with no progress) ==
Help them up ONE rung — you are at rung ${eff} of ${cap} for this format. ${rung[eff]} Never hand over the full answer. The moment they regain momentum, stop hinting and resume normal probing.`;
}
