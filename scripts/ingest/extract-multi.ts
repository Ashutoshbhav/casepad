// Second-pass extractor for PDFs that have NO machine-detectable case headers
// (Indian casebooks: IIMA, ISB, XLRI, IIM-B/C/I, KTC, MDI, FMS, plus generic
// books like Chicago/Fuqua/Emory). Sends a large slab of text to DeepSeek V4
// and asks it to return an ARRAY of cases — the LLM does case-boundary
// detection itself, bypassing the regex problem entirely.

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

// Tighter slabs + larger overlap for zero-case-loss. A typical case is 1-3k
// chars; overlap of 4k means any case fully fits inside at least one slab
// boundary, and the dedup on (casebook, title) absorbs the cases that match
// in two consecutive slabs.
export const SLAB_CHARS = 18_000;
export const SLAB_OVERLAP = 4_000;

export function buildMultiExtractionMessages(slab: string): Msg[] {
  const system = `You read consulting casebook text and extract EVERY distinct case study you find as JSON.

Output JSON only with this exact schema:
{
  "cases": [
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
  ]
}

Hard rules:
- ZERO-MISS RULE: extract every business scenario you can find. If a chunk of text has a company + a situation + a question or decision to evaluate — extract it as a case. Be inclusive. Even a brief mention of "should X enter Y market" counts.
- DO NOT INVENT data. If the text doesn't have a number/framework/insight, leave it out. Never fabricate.
- trigger_keywords: 3-6 short noun phrases per note, NOT full sentences.
- Skip ONLY: blank pages, legal disclaimers, certificates of participation, pure tables of contents with no body. Everything else extract.
- If a case appears partially cut off at the slab boundary, skip it (it'll be caught by the next overlapping slab).`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `CASEBOOK TEXT:\n\n${slab}\n\nReturn JSON only.` },
  ];
}

function endpoint(): { url: string; model: string; key: string } {
  const baseURL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;
  let key = process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY || '';
  let model = process.env.LLM_LOCAL_MODEL || 'deepseek-ai/deepseek-v4-flash';
  if (baseURL.includes('localhost')) key = 'ollama-local';
  return { url, model, key };
}

export async function extractMultiCases(slab: string): Promise<any[]> {
  const messages = buildMultiExtractionMessages(slab);
  const { url, model, key } = endpoint();

  for (let attempt = 0; attempt < 5; attempt++) {
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
          max_tokens: 6000, // up to ~10 cases per slab
          stream: false,
        }),
      });

      if (r.status === 429) {
        if (attempt === 4) throw new Error('429 after 5 retries');
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
      const content = data?.choices?.[0]?.message?.content || '{"cases":[]}';
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed?.cases) ? parsed.cases : [];
      } catch {
        return [];
      }
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
    }
  }
  return [];
}

// Slide a window of SLAB_CHARS chars over the document with SLAB_OVERLAP.
export function slabify(text: string): string[] {
  const slabs: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + SLAB_CHARS);
    slabs.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - SLAB_OVERLAP;
  }
  return slabs;
}
