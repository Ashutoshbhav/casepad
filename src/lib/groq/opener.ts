// src/lib/groq/opener.ts
//
// Generates the AI interviewer's first turn for a freshly-created session.
//
// Why this exists:
//   Real case interviews start with the interviewer presenting the case prompt
//   ("Hi, I'm Ash from Bain. Today we're looking at...") and the candidate
//   responds. The previous flow dropped users into a blank chat box, which is
//   ChatGPT-shaped, not interview-shaped. Two real users yesterday led with
//   the same copy-pasted "Before I structure my approach..." line — a textbook
//   cold-start friction symptom.
//
// What it does:
//   - Synchronous-ish (~1s on Groq's llama-3.1-8b-instant) opener generation
//   - Persona is hardcoded for v1 — "Ash, Engagement Manager at Bain". Adding
//     persona variety (different firms / tones per session) is a future iter.
//   - Returns a 2-3 sentence opener + opening question.
//   - On any LLM failure, returns a deterministic static fallback so session
//     creation NEVER blocks on the AI being up.
//
// What it deliberately does NOT do:
//   - Does NOT see `ideal_structure` (would leak the answer key).
//   - Does NOT see `interviewer_notes` (those are gated reveals for /api/chat).
//   - Does NOT touch the existing per-turn /api/chat logic.
//
// Cost / perf:
//   - 8b-instant on Groq, max 220 tokens, temp 0.5.
//   - Inline in startSession() server action, before redirect.

import { groq, MODEL_SMALL } from './client';
import { completeChat } from '@/lib/llm-router';

export interface InterviewerPersona {
  name: string;
  firm: string;
  role: string;
  tone: 'warm-but-rigorous' | 'blunt-mbb' | 'friendly-startup';
}

// v1 default persona. Hardcoded by design — keeps scope tight. The session
// row doesn't yet store persona; if/when we want variety we'll add a column.
export const DEFAULT_PERSONA: InterviewerPersona = {
  name: 'Ash',
  firm: 'Bain',
  role: 'Engagement Manager',
  tone: 'warm-but-rigorous',
};

interface OpenerInput {
  caseTitle: string;
  problemStatement: string;
  persona?: InterviewerPersona;
  /**
   * Optional one-line continuity hint about the user's last completed session.
   * When present, the opener may briefly reference it (one short clause max)
   * to make Ash feel like a coach who remembers — not a fresh stranger.
   * Pass null/undefined for first-time-or-cold-start users so the LLM does
   * NOT fabricate prior-session details.
   */
  priorSession?: {
    caseTitle: string;
    caseType: string;
    score: number;
    /** Lowest-scoring rubric dimension from last session, e.g. "structure" or "pricing". Optional. */
    weakDimension?: string | null;
  } | null;
}

const SYSTEM_PROMPT = (persona: InterviewerPersona) => `You are ${persona.name}, an ${persona.role} at ${persona.firm}, opening a live case interview with a candidate. Your tone is ${persona.tone === 'warm-but-rigorous' ? 'warm but rigorous — friendly greeting, then crisp business framing' : persona.tone === 'blunt-mbb' ? 'direct, no small talk, MBB-style' : 'friendly and conversational, startup-style'}.

OUTPUT REQUIREMENTS:
1. 2 to 3 sentences total. No more.
2. Sentence 1: brief greeting + identify yourself (name + firm). If a PRIOR_SESSION block is provided, you MAY replace or shorten the greeting with one short clause referencing it — e.g. "Last time we did profitability — let's see if you hold structure under M&A pressure today." or "Welcome back — your scoping was sharp last session, today's about depth." Only ONE short clause; do not narrate the prior session.
3. Sentence 2: deliver the case prompt — paraphrase the problem statement in plain English, do NOT copy it verbatim, do NOT add facts that aren't in it.
4. End with ONE open kickoff question that invites the candidate to take the lead (e.g. "How would you approach this?" or "Where would you like to start?"). Do NOT ask multiple questions.
5. Do NOT give hints, frameworks, structure suggestions, or analysis. The candidate must drive.
6. Do NOT invent numbers, competitors, time horizons, or constraints not present in the problem statement.
7. No markdown, no bullet points, no headers — pure spoken-style prose. No emojis.
8. CONTINUITY DISCIPLINE: If a PRIOR_SESSION block is NOT provided, do NOT reference any prior session, prior score, or "last time" — there is none. Do NOT fabricate prior-session details. If PRIOR_SESSION IS provided, do not invent details beyond what's stated; reference it only at the level given (case_type and/or weak dimension).`;

const USER_PROMPT = (
  caseTitle: string,
  problemStatement: string,
  priorSession: OpenerInput['priorSession']
) => {
  const priorBlock = priorSession
    ? `\nPRIOR_SESSION (the candidate's last completed session — you MAY reference this in one short clause):
- last case title: ${priorSession.caseTitle}
- last case type: ${priorSession.caseType.replace(/_/g, ' ')}
- last score: ${priorSession.score}/100${priorSession.weakDimension ? `\n- weakest dimension last time: ${priorSession.weakDimension.replace(/_/g, ' ')}` : ''}\n`
    : '';
  return `CASE TITLE: ${caseTitle}

PROBLEM STATEMENT:
${problemStatement}
${priorBlock}
Now deliver your 2-3 sentence opening to the candidate.`;
};

/** Static fallback used when every LLM provider fails. Never blocks session create. */
function staticOpener(input: OpenerInput): string {
  const persona = input.persona ?? DEFAULT_PERSONA;
  return `Hi, I'm ${persona.name}, an ${persona.role} at ${persona.firm}. Here's the case: ${input.problemStatement} How would you like to approach this?`;
}

/**
 * Generates the interviewer's opening turn.
 * Tries Groq 8b-instant first (sub-1s, cheap), falls through to the 4-layer
 * llm-router (Groq 70b → NVIDIA → Cerebras → OpenRouter) on failure, then
 * to a static fallback. Always returns a non-empty string.
 */
export async function generateOpener(input: OpenerInput): Promise<string> {
  const persona = input.persona ?? DEFAULT_PERSONA;
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT(persona) },
    {
      role: 'user' as const,
      content: USER_PROMPT(input.caseTitle, input.problemStatement, input.priorSession ?? null),
    },
  ];

  // Layer 1: Groq 8b-instant directly (fastest path, sub-1s typical).
  try {
    const r = await groq.chat.completions.create({
      model: MODEL_SMALL,
      messages,
      max_tokens: 220,
      temperature: 0.5,
    });
    const content = r.choices?.[0]?.message?.content?.trim();
    if (content) return content;
  } catch {
    // fall through to router
  }

  // Layer 2-5: existing 4-layer fortress.
  try {
    const content = (await completeChat({
      messages,
      max_tokens: 220,
      temperature: 0.5,
    })).trim();
    if (content) return content;
  } catch {
    // fall through to static
  }

  // Layer 6: deterministic fallback. Session create must never block.
  return staticOpener(input);
}
