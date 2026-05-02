import type { CheatSheetState } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

// Build the LLM prompt that extracts structured cheat-sheet fields from
// the rolling transcript. Pass recent transcript (not just latest exchange)
// so multi-turn structure/hypothesis statements are detected.
//
// The framework + hypothesis fields had a chronic empty-state bug because:
//   (a) the LLM only saw one turn at a time, missing framework declarations
//       that spanned turns
//   (b) the prompt was conservative ("only if the exchange clearly informs")
//       which biased toward null
// Fix: send last ~8 turns + give explicit positive examples + tell the LLM
// to actively detect framework/hypothesis signals.

export function buildCheatSheetExtractionMessages(
  userQuestion: string,
  interviewerAnswer: string,
  current: CheatSheetState,
  recentTranscript?: { role: string; content: string }[],
): Msg[] {
  const lockedList = current.locked_fields.length
    ? current.locked_fields.join(', ')
    : '(none)';

  const transcriptBlock = (recentTranscript && recentTranscript.length > 0)
    ? recentTranscript
        .slice(-8)
        .map((t) => `[${t.role.toUpperCase()}] ${t.content.slice(0, 800)}`)
        .join('\n\n')
    : `[USER] ${userQuestion}\n\n[INTERVIEWER] ${interviewerAnswer}`;

  const system = `You update a structured cheat sheet for a case interview in progress.

Output JSON only. Schema:
{
  "framework": string | null,            // 1-2 sentence summary of the candidate's structure
  "hypothesis": string | null,           // 1 sentence: candidate's leading hypothesis
  "key_numbers": [{ "label": string, "value": string, "unit": string | null }],
  "decisions": string[],
  "next_steps": string[]
}

DETECTION RULES — be ACTIVE about extracting:

**framework**: Extract whenever the candidate states or implies a structured approach. Common signals:
- "My structure is…" / "I'd break this into…" / "I'll evaluate this on N branches…"
- Lists like "(1) X (2) Y (3) Z" or "first… second… third…"
- Named frameworks: "profitability tree", "market entry", "M&A", "porter's 5 forces", "4 Ps", "AARRR", "MECE decomposition"
- Implicit: "I want to look at revenue and cost separately" → framework: "Profitability tree (revenue × cost)"
Format: 1-2 sentences naming the structure + the L1 branches.

**hypothesis**: Extract whenever the candidate commits to a leading bet. Common signals:
- "My hypothesis is…" / "I think the issue is…" / "My initial bet is…"
- "I expect X is the driver because…"
- Strong directional commits: "InvestCo should NOT enter precious metals because Y1 cashflow is negative"
- Even soft commits: "My gut says cost is the bigger issue here"
Format: 1 short declarative sentence.

**key_numbers**: Extract every numeric fact mentioned (revenue, cost, %, units, market size). Don't invent — only extract.

**decisions**: Active choices the candidate has made (which branch to start with, what to ignore, recommendation).

**next_steps**: What the candidate says they'll do next ("calculate Y2 revenue", "test the cost hypothesis").

PRESERVATION RULES:
- LOCKED FIELDS (do NOT modify; copy current value): ${lockedList}
- For arrays: APPEND new items, don't replace. Don't duplicate.
- For framework + hypothesis: if you detect a NEW or REFINED version, OVERWRITE the current. If the candidate has not said anything new about structure, keep current value.
- If nothing relevant in the latest turns, return current state unchanged.`;

  const user = `CURRENT CHEAT SHEET:
${JSON.stringify(current, null, 2)}

RECENT TRANSCRIPT (most recent at bottom):
${transcriptBlock}

Return the updated cheat sheet JSON.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
