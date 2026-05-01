// Direct fetch to whichever OpenAI-compatible /v1/chat/completions endpoint
// is configured. Avoids the Groq SDK's hardcoded `/openai/v1/...` path
// which is incompatible with NVIDIA NIM and other OpenAI-compatible hosts.

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
- ideal_structure should reflect what's in the text; if the text shows only a framework name with no branches, use an empty branches array.
- IMPORTANT: trigger_keywords should be 3-6 short noun phrases per note, NOT full sentences or transcript dumps.
- ZERO-MISS RULE: if the text contains ANY business situation, company scenario, or problem-solving context — even faintly case-shaped — extract it. Do not gate on whether it "looks like a textbook case". The orchestrator filters out unusable rows; your job is to never miss a real case. Only return null when the text has literally no business content (e.g. completely blank, certificate, legal disclaimer, table of contents only).`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `RAW CASE TEXT:\n\n${caseText.slice(0, 8000)}\n\nReturn JSON only.` },
  ];
}

function endpoint(): { url: string; model: string; key: string } {
  const baseURL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;
  let key = '';
  let model = process.env.LLM_LOCAL_MODEL || 'llama-3.1-8b-instant';
  if (baseURL.includes('nvidia.com')) {
    key = process.env.NVIDIA_API_KEY || '';
    model = process.env.LLM_LOCAL_MODEL || 'deepseek-ai/deepseek-v4-flash';
  } else if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    key = 'ollama-local';
  } else {
    key = process.env.GROQ_API_KEY || '';
    model = 'llama-3.1-8b-instant';
  }
  return { url, model, key };
}

export async function extractCase(caseText: string): Promise<any | null> {
  const messages = buildExtractionMessages(caseText);
  const { url, model, key } = endpoint();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500,
          stream: false,
        }),
      });

      if (r.status === 429) {
        if (attempt === 4) throw new Error('429 after 5 retries');
        // Exponential backoff with jitter when no Retry-After header.
        const retryAfter = Number(r.headers.get('retry-after')) || 0;
        const backoff = retryAfter > 0
          ? (retryAfter + 1) * 1000
          : Math.min(60_000, 5_000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 2000);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }

      if (!r.ok) {
        const body = await r.text();
        throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
      }

      const data = await r.json() as any;
      const content = data?.choices?.[0]?.message?.content || '{}';
      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  return null;
}
