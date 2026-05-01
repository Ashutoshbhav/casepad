import { groq, MODEL_SMALL, MODEL_LARGE } from '../../src/lib/groq/client';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildExtractionMessages(caseText: string): Msg[] {
  const system = `You convert raw consulting case text into a structured database row.

Output JSON only with this exact schema:
{
  "title": string,
  "industry": one of ["consulting","fmcg","tech","healthcare","finance","infra","energy","retail","other"],
  "case_type": one of ["market_entry","profitability","mna","pricing","operations","gtm","estimation","other"],
  "difficulty": one of ["easy","medium","hard","expert"],
  "source": string | null,
  "problem_statement": string,
  "interviewer_notes": [{"trigger_keywords": string[], "reveal_text": string}],
  "ideal_structure": {"framework": string | null, "branches": [{"node": string, "subnodes": string[]}], "key_insights": string[]},
  "tags": string[]
}

Rules:
- DO NOT INVENT data. If a field is genuinely missing in the input, use null/empty array. Never make up numbers, frameworks, or insights.
- Infer industry/case_type/difficulty from the text where reasonable, otherwise pick "other"/"medium" as defaults.
- interviewer_notes should capture the "reveal-on-question" structure: each note's trigger_keywords are short noun phrases the candidate would naturally ask, and reveal_text is the answer.
- ideal_structure should reflect what's in the text; if the text shows only a framework name with no branches, use an empty branches array.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `RAW CASE TEXT:\n\n${caseText.slice(0, 8000)}\n\nReturn JSON only.` },
  ];
}

export async function extractCase(caseText: string, useLarge = false): Promise<any | null> {
  const messages = buildExtractionMessages(caseText);

  // Groq enforces both RPM and TPM. The orchestrator's Throttle covers RPM;
  // TPM bursts (free tier llama-3.1-8b is 6000 TPM) still trip 429s. Retry
  // up to 3 times honoring the retry-after hint when present.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: useLarge ? MODEL_LARGE : MODEL_SMALL,
        messages: messages as any,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
      });
      try {
        return JSON.parse(completion.choices[0].message.content || '{}');
      } catch {
        return null;
      }
    } catch (err: any) {
      if (err?.status === 429 && attempt < 2) {
        const retryAfterSec = Number(err?.headers?.['retry-after']) || 5;
        const waitMs = (retryAfterSec + 1) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  return null;
}
