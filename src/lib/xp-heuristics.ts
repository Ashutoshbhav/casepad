// Deterministic XP heuristic for the live in-session ticker.
//
// The on-debrief score is the source of truth (it's the LLM-graded one in
// /api/evaluate). XP shown here is a *gamified visual feedback* loop — its
// only job is to tell the candidate "your last turn registered" so the
// session doesn't feel like talking into a void. Cohort feedback was
// "the AI feels boring and non-engaging"; this is the cheap fix.
//
// Rubric per user turn (capped at +30 to stop keyword-stuffing):
//   base                                 +10  (showed up)
//   length ≥ 30 words                    + 5  (substantive)
//   structure markers (MECE-like cues)   +10  (organized thinking)
//   number / quant attempt                +10  (analytical move)
//   hypothesis marker                     + 5  (taking a stance)
//
// Floor +10, cap +30. Only counts user turns; interviewer turns score 0.

const STRUCTURE_RE = /\b(first|second|third|fourth|finally|framework|buckets?|categor(?:y|ies)|hypoth(?:esis|esize)|MECE|three\s+things|two\s+buckets?)\b/i;
const NUMBER_RE = /\b\d{1,}(?:[.,]\d+)?\s*(?:%|million|billion|k|m|cr|crore|lakh|x|×|times)?\b/i;
const HYPOTHESIS_RE = /\b(I\s+(?:think|believe|expect|hypothesize|would\s+expect)|my\s+hypothesis|I'd\s+guess|I'd\s+bet|leaning\s+toward|my\s+best\s+guess)\b/i;
const LIST_RE = /(?:^|\n)\s*(?:[-•*]|\d+[.)])\s/m;

export type ScoredTurn = {
  base: number;
  length: number;
  structure: number;
  quant: number;
  hypothesis: number;
  total: number;
};

export function scoreTurn(content: string): ScoredTurn {
  const text = (content || '').trim();
  if (!text) return { base: 0, length: 0, structure: 0, quant: 0, hypothesis: 0, total: 0 };

  const wordCount = text.split(/\s+/).length;

  const base = 10;
  const length = wordCount >= 30 ? 5 : 0;
  const structure = STRUCTURE_RE.test(text) || LIST_RE.test(text) ? 10 : 0;
  const quant = NUMBER_RE.test(text) ? 10 : 0;
  const hypothesis = HYPOTHESIS_RE.test(text) ? 5 : 0;

  const raw = base + length + structure + quant + hypothesis;
  const total = Math.min(raw, 30);

  return { base, length, structure, quant, hypothesis, total };
}

type TurnLike = { role: 'user' | 'interviewer'; content: string };

export function totalXp(messages: readonly TurnLike[]): number {
  let xp = 0;
  for (const m of messages) {
    if (m.role !== 'user') continue;
    xp += scoreTurn(m.content).total;
  }
  return xp;
}

export function lastUserDelta(prev: readonly TurnLike[], next: readonly TurnLike[]): number {
  const prevLastUserIdx = lastUserIndex(prev);
  const nextLastUserIdx = lastUserIndex(next);
  if (nextLastUserIdx === -1) return 0;
  if (nextLastUserIdx === prevLastUserIdx) return 0;
  return scoreTurn(next[nextLastUserIdx].content).total;
}

function lastUserIndex(messages: readonly TurnLike[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return i;
  }
  return -1;
}
