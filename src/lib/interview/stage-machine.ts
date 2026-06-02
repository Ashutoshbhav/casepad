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
  | 'synthesis' // pulling the findings together
  | 'recommendation' // the bottom-line answer to the decision-maker
  | 'wrap'; // candidate questions + close

export interface StageContext {
  track: Track;
  caseType: CaseType;
  /** True for pure market-sizing / guesstimate cases — biases toward quant. */
  isEstimation: boolean;
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
}

type Turn = { role: string; content: string };

// After this many candidate turns with no synthesis yet, the interviewer
// deterministically drives the close ("tell me your answer now"). Real EMs
// interrupt overlong analysis to land a recommendation; the old prose said
// "8+ turns" but nothing counted. 9 leaves room for a proper analysis phase.
const CLOSE_TURN = 9;

// ---- signal detectors (lenient, never throw) --------------------------------

const STRUCTURE_RE =
  /\b(framework|structure|i'?d (?:break|split|divide|bucket|segment)|buckets?|mece|issue tree|three (?:areas|buckets|things)|drivers?|first(?:ly)?,?\s+.*second(?:ly)?|on (?:the )?(?:revenue|cost) side|two (?:angles|lenses|dimensions))\b/i;

const MATH_RE =
  /(\d[\d,.]*\s*(?:%|percent|million|mn|bn|billion|k\b|crore|lakh|x\b))|(\d[\d,.]*\s*[×x*/÷+\-]\s*\d)|\b(?:roughly|approximately|estimate|assume|let'?s say|multiply|divide|times|per (?:user|customer|year|month|day|capita))\b/i;

const SYNTHESIS_RE =
  /\b(in summary|to summari[sz]e|to synthesi[sz]e|bottom line|bottom-line|my recommendation|i'?d recommend|the (?:answer|takeaway) is|so (?:the|my) answer|stepping back,? (?:the|my)|net[- ]net|in short|if i had to (?:tell|sum)|pulling (?:this|it) together)\b/i;

const RECOMMENDATION_RE =
  /\b(i recommend|my recommendation is|we should (?:enter|launch|acquire|exit|raise|cut|invest|not)|the company should|i'?d (?:advise|tell the (?:ceo|client)))\b/i;

function textOfCandidate(transcript: Turn[]): string {
  return transcript
    .filter((t) => t && t.role === 'user' && typeof t.content === 'string')
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

  const signals: StageSignals = {
    hasStructure: STRUCTURE_RE.test(allCandidate),
    mathActive: MATH_RE.test(recentText),
    hasSynthesis: SYNTHESIS_RE.test(allCandidate),
    hasRecommendation: RECOMMENDATION_RE.test(allCandidate),
    nearEnd: candidateTurns >= CLOSE_TURN,
  };

  const stage = pickStage(candidateTurns, signals, ctx);
  return { stage, candidateTurns, signals };
}

function pickStage(
  candidateTurns: number,
  s: StageSignals,
  ctx: StageContext
): Stage {
  // Opening: the candidate hasn't said anything substantive yet.
  if (candidateTurns === 0) return 'scoping';

  // Late-arc states win — once the candidate has landed a recommendation we're
  // wrapping up; if they've synthesised, push them to commit the recommendation.
  if (s.hasRecommendation) return 'wrap';
  if (s.hasSynthesis) return 'recommendation';

  // Drive-to-close: past the close threshold with no synthesis yet → the
  // interviewer forces the synthesis. This is the deterministic version of the
  // old "force a synthesis at 8+ turns" prose that nothing enforced.
  if (s.nearEnd) return 'synthesis';

  // Mid-case: an active math/estimation thread routes to quant (guesstimate
  // mode hooks here). Pure-estimation cases bias here as soon as numbers start.
  if (s.mathActive) return 'quant';

  // Estimation cases that haven't started numbers yet still belong in structure
  // first (decompose before you compute) — handled by the structure branch.
  if (s.hasStructure) return 'analysis';

  // Very early, no structure yet → still scoping.
  if (candidateTurns <= 1) return 'scoping';

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
The candidate is just getting oriented. Let them ask clarifying questions and restate the objective. Do NOT feed analysis or hand them a structure. If they jump straight to a framework without understanding the goal, pull them back: "Before structure — what are we actually solving for?" Advance them once they've grasped the objective and started to structure.`;
    case 'structure':
      return `${head}
Push for a SPECIFIC, case-fit structure with a hypothesis — not a memorised template. Pressure-test MECE and "why these buckets?". Do NOT release data yet and do NOT analyse for them. Advance once they've committed a prioritised structure and named where they'd start.`;
    case 'analysis':
      return `${head}
They're working a branch. Release gated data only when their question matches a reveal trigger. Make them interpret every number ("so what?"), defend assumptions, and follow their own hypothesis. Redirect if they wander off their structure. Push toward the quantitative core when one exists.`;
    case 'quant':
      return `${head}
There's a live ${ctx.isEstimation ? 'estimation/sizing' : 'math'} thread. Make them state assumptions explicitly and sanity-check the result (order of magnitude, ±range). Do NOT do the arithmetic for them. If they hand-wave the math, call it. Once the number is defended, ask "so what does that tell us?" and move toward synthesis.`;
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
