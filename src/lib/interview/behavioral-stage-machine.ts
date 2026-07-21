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
This is the core of the interview. Draw your questions from the VETTED QUESTION BANK in the system prompt, moving across dimensions (leadership, drive, growth, judgment, resilience, connection, curiosity — don't repeat a dimension already covered well). Use each question's "spike" and "watch" notes to evaluate the answer. For each answer: push for the SPECIFIC action THEY took ("you said 'we' — what did YOU specifically do?"), press for concrete numbers/outcomes over vague claims, and probe self-awareness ("what would you do differently?"). Don't accept a rehearsed-sounding answer at face value — ask a real follow-up. One question and its follow-ups at a time; don't stack multiple questions in one turn.`;
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
