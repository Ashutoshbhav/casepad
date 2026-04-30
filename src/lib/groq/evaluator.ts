import type { ChatMessage, IdealStructure, CheatSheetState } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildEvaluatorMessages(
  transcript: ChatMessage[],
  ideal: IdealStructure,
  cheatSheet: CheatSheetState,
  elapsedSeconds: number
): Msg[] {
  const elapsedMin = Math.round(elapsedSeconds / 60);
  const idealJson = JSON.stringify(ideal, null, 2);
  const isEmpty =
    !ideal || (!ideal.framework && !(ideal.branches?.length ?? 0));

  const system = `You evaluate a consulting case interview transcript against an ideal structure.

Score on three dimensions:
- Structure (0-40): Did the candidate use the right framework? Were the key branches covered?
- Insight (0-40): Were hypotheses well-formed? Did they connect data to conclusions?
- Speed (0-20): Time taken vs benchmark. Easy=15min, Medium=25min, Hard=35min, Expert=45min. 20pt if at or under benchmark, scaled down to 5pt at 2x benchmark.

Return JSON only:
{
  "structure": int,
  "insight": int,
  "speed": int,
  "total": int,
  "gaps": string[],
  "strengths": string[],
  "insufficient_data": boolean
}

Note: total = structure + insight + speed.
Note: "gaps" = 3-6 specific things the candidate missed or did poorly.
Note: "strengths" = 2-4 things they did well.

If insufficient_data is true, set structure=0, insight=0, total=speed, and explain in gaps.`;

  const user = `IDEAL STRUCTURE:
${idealJson}

FINAL CHEAT SHEET:
${JSON.stringify(cheatSheet, null, 2)}

TRANSCRIPT (${transcript.length} turns):
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}

Elapsed: ${elapsedMin} min

Score this case. JSON only.`;

  return [
    { role: 'system', content: system + (isEmpty ? '\nNote: ideal_structure is empty. Set insufficient_data=true.' : '') },
    { role: 'user', content: user },
  ];
}
