// src/lib/interview/behavioral-stage-machine.ts
//
// Stage machine for the CASELESS live interviewer (behavioral / culture-fit /
// résumé-grounded). Sibling to ./stage-machine.ts, not a variant of it — the
// case machine's stages (structure/analysis/quant/...) have no behavioral
// equivalent, so this is its own arc:
//
//   warmup → resume_probe → behavioral_deep_dive → culture_fit → wrap
//
// Same design contract as the case stage machine: pure function of the
// transcript, deterministic, and fail-open (never throws — any error here can
// only cost signal, never block a turn). (FORTRESS.)
//
// Unlike the case machine, behavioral answers don't have clean lexical
// markers for "did they land a structure" the way MECE/framework language
// does for cases — so progression here is turn-count-driven, same principle
// as the case machine's `nearEnd`/CLOSE_TURN drive-to-close, just applied
// across the whole arc instead of only at the end.

export type BehavioralStage =
  | 'warmup' // opening, orienting the candidate
  | 'resume_probe' // grounding questions from the candidate's résumé
  | 'behavioral_deep_dive' // STAR questions + follow-ups across dimensions
  | 'culture_fit' // firm-values alignment, "why here" territory
  | 'wrap'; // close + candidate questions

export interface BehavioralStageContext {
  /** Whether a parsed résumé is available to ground questions in. */
  hasResume: boolean;
  /** Target firm for culture-fit flavor, if the candidate specified one. */
  targetFirm?: string | null;
}

export interface BehavioralStageState {
  stage: BehavioralStage;
  candidateTurns: number;
}

type Turn = { role: string; content: string };

// Turn thresholds — same "drive the arc forward on a schedule" principle as
// the case machine's CLOSE_TURN, since there's no reliable content signal for
// "this story is fully told" the way there is for "they stated a structure".
const RESUME_PROBE_END = 2;
const DEEP_DIVE_END = 7;
const CULTURE_FIT_END = 9;

export function candidateTurnCount(transcript: Turn[]): number {
  if (!Array.isArray(transcript)) return 0;
  return transcript.filter((t) => t && t.role === 'user').length;
}

/**
 * Compute the current behavioral-interview stage from the transcript. Pure +
 * total: malformed input yields a safe default ('warmup') rather than
 * throwing.
 */
export function inferBehavioralStage(
  transcript: Turn[],
  ctx: BehavioralStageContext
): BehavioralStageState {
  const safe = Array.isArray(transcript) ? transcript : [];
  const candidateTurns = candidateTurnCount(safe);
  const stage = pickStage(candidateTurns, ctx);
  return { stage, candidateTurns };
}

function pickStage(candidateTurns: number, ctx: BehavioralStageContext): BehavioralStage {
  if (candidateTurns === 0) return 'warmup';
  if (ctx.hasResume && candidateTurns <= RESUME_PROBE_END) return 'resume_probe';
  if (candidateTurns <= DEEP_DIVE_END) return 'behavioral_deep_dive';
  if (candidateTurns <= CULTURE_FIT_END) return 'culture_fit';
  return 'wrap';
}

/**
 * The behavioural directive injected into the system prompt for the current
 * stage — same injection point/contract as the case machine's stageDirective
 * (appended at the END of the system prompt, the highest-attention zone).
 */
export function behavioralStageDirective(
  stage: BehavioralStage,
  ctx: BehavioralStageContext
): string {
  const head = `== CURRENT STAGE: ${stage.toUpperCase()} ==`;
  switch (stage) {
    case 'warmup':
      return `${head}
Open the interview. Brief, warm, orienting — tell them what this round covers (behavioral / fit) and ask an easy opening question ("walk me through your background" or similar). Do NOT dive into a hard STAR question yet.`;
    case 'resume_probe':
      return `${head}
Ask 1-2 questions grounded in a SPECIFIC detail from their résumé (a role, a project, a gap, a transition) — not a generic "tell me about X company". If something on the résumé looks unusual or worth understanding (a career pivot, an unusually short stint, an ambiguous title), ask about it directly and neutrally. Do NOT start a full STAR drill yet — this stage is orientation, not evaluation.`;
    case 'behavioral_deep_dive':
      return `${head}
This is the core of the interview, and it is a GRILLING, not a survey. Draw your questions from the VETTED QUESTION BANK in the system prompt, moving across dimensions (leadership, drive, growth, judgment, resilience, connection, curiosity — don't repeat a dimension already covered well). Use each question's "spike" and "watch" notes to evaluate the answer. HARD RULE: every story gets a MINIMUM of one probing follow-up before you move to a new question — two or more if anything stays vague — and you never take an answer at face value: push for the SPECIFIC action THEY took ("you said 'we' — what did YOU specifically do?"), press for concrete numbers/outcomes, challenge the part that sounded too clean, and cross-check claims against the résumé when one is on file. Covering fewer stories deeply beats covering more stories shallowly — depth IS the interview. One question and its follow-ups at a time; don't stack multiple questions in one turn.`;
    case 'culture_fit':
      return `${head}
Shift to fit and motivation — why this path, why this firm/role specifically, how they'd handle a real values tension (not a hypothetical softball). If a target firm's culture-fit dimensions are provided below, probe those specifically instead of generic "why us" questions. Push back on generic, could-say-this-anywhere answers.`;
    case 'wrap':
      return `${head}
The interview is essentially done. Acknowledge briefly (no gushing), then invite their questions and close cleanly. Do NOT reopen a prior story.`;
    default:
      return head;
  }
}

// ---------------------------------------------------------------------------
// Answer-depth check — the deterministic half of the "don't jump to the next
// question when my answer was thin" fix (reported live by Ash: the
// interviewer would move on from a vague answer instead of following up).
// The prompt carries the behavioural rule; this catches the two cheap,
// lexically-detectable failure shapes and injects a hard per-turn directive
// so the model can't drift past them. Same fail-open contract as the rest of
// this module: pure, total, never throws.
// ---------------------------------------------------------------------------

export type AnswerDepthIssue = 'brief' | 'no_individual_action';

// A spoken STAR story runs well past 100 words; under this it cannot contain
// a situation, a specific action, AND an outcome. Deliberately conservative —
// a false "thin" flag forces one extra follow-up (annoying), a false pass
// just falls back to the prompt-level rule (harmless).
const BRIEF_WORD_LIMIT = 35;
// Below this length, an answer with zero first-person markers is an
// all-"we"/all-context story with no individual action to evaluate. Longer
// answers get the benefit of the doubt (the prompt-level "four 'we's and no
// 'I'" rule still applies to them).
const NO_ACTION_WORD_LIMIT = 90;

/**
 * Assess whether the candidate's latest answer is too thin to move past.
 * Returns the issue, or null when the answer is substantial enough (or is a
 * clarification question, which the interviewer's own confusion-handling
 * rule covers — forcing a story follow-up onto "can you repeat that?" would
 * be wrong).
 */
export function assessAnswerDepth(answer: unknown): AnswerDepthIssue | null {
  if (typeof answer !== 'string') return null;
  const text = answer.trim();
  if (!text) return 'brief';
  const words = text.split(/\s+/).filter(Boolean);
  if (text.endsWith('?') && words.length < 60) return null;
  if (words.length < BRIEF_WORD_LIMIT) return 'brief';
  if (words.length < NO_ACTION_WORD_LIMIT && !/\b(i|my|me|i'm|i've|i'd)\b/i.test(text)) {
    return 'no_individual_action';
  }
  return null;
}

/**
 * Per-turn directive injected AFTER the stage directive when the latest
 * answer failed the depth check — the very end of the system prompt is the
 * highest-attention zone, so this outranks the stage's own "move across
 * dimensions" instruction for this one turn.
 */
export function followUpDirective(issue: AnswerDepthIssue): string {
  const head = '== THIS TURN: FOLLOW UP, DO NOT ADVANCE (deterministic answer-depth check) ==';
  if (issue === 'brief') {
    return `${head}
The candidate's last answer was too brief to evaluate — it cannot contain a full situation, their specific action, AND a concrete outcome. Do NOT move to a new question or a new dimension this turn. Ask ONE follow-up that digs into the SAME story: whichever piece is missing (what the situation actually was, what THEY specifically did, or what the measurable outcome was).`;
  }
  return `${head}
The candidate's last answer named no individual action — all team/context framing, no "I did X". Do NOT move to a new question this turn. Push on the SAME story for what THEY specifically did.`;
}
