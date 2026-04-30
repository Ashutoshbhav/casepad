import type { CheatSheetState } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildCheatSheetExtractionMessages(
  userQuestion: string,
  interviewerAnswer: string,
  current: CheatSheetState
): Msg[] {
  const lockedList = current.locked_fields.length
    ? current.locked_fields.join(', ')
    : '(none)';
  const system = `You update a structured cheat sheet for a consulting case in progress.

Output JSON only. Schema:
{
  "framework": string | null,
  "hypothesis": string | null,
  "key_numbers": [{ "label": string, "value": string, "unit": string | null }],
  "decisions": string[],
  "next_steps": string[]
}

Rules:
- Only update fields that the latest exchange clearly informs.
- Do NOT invent numbers — only extract them if present in the exchange.
- LOCKED FIELDS (locked_fields — do NOT modify these; leave the value identical to the current state): ${lockedList}
- Merge with the current state intelligently. For arrays, append new items rather than replacing.
- If nothing in the exchange is relevant, return the current state unchanged.`;

  const user = `CURRENT CHEAT SHEET:
${JSON.stringify(current, null, 2)}

LATEST EXCHANGE:
Q: ${userQuestion}
A: ${interviewerAnswer}

Return the updated cheat sheet JSON.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
