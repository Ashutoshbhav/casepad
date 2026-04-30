import type { CaseRow, ChatMessage } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildInterviewerMessages(
  caseRow: Pick<CaseRow, 'problem_statement' | 'interviewer_notes' | 'title'>,
  alreadyDisclosed: string[],
  transcript: ChatMessage[]
): Msg[] {
  const notesBlock = (caseRow.interviewer_notes || [])
    .map((n, i) => `${i + 1}. triggers: [${n.trigger_keywords.join(', ')}]\n   reveal: ${n.reveal_text}`)
    .join('\n');
  const disclosedBlock = alreadyDisclosed.length
    ? alreadyDisclosed.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : '(none yet)';

  const system = `You are a consulting interviewer running a case study with a candidate.

CASE: ${caseRow.title}

PROBLEM STATEMENT (always known to you):
${caseRow.problem_statement}

REVEAL NOTES (you know these; do NOT proactively share — only reveal a note when the candidate's question semantically matches its trigger keywords):
${notesBlock}

ALREADY DISCLOSED (do not repeat):
${disclosedBlock}

RULES:
- Stay in character as a neutral, concise consulting interviewer.
- Never invent facts that are not in the problem statement or reveal notes. If asked something not covered, say "I don't have data on that — what would you assume and why?"
- If the candidate has gone 3+ turns without a clarifying question or structure, gently nudge them ("Want to walk me through your structure so far?").
- Do not lead the candidate. Do not give hints unless they are explicitly stuck.
- Keep responses under 80 words.`;

  const recent: Msg[] = transcript.slice(-10).map((t) => ({
    role: t.role === 'interviewer' ? ('assistant' as const) : ('user' as const),
    content: t.content,
  }));

  return [{ role: 'system', content: system }, ...recent];
}
