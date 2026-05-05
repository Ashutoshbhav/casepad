// Guesstimate-specific LLM extractor. Different shape from extract.ts which
// is tuned for full consulting interview cases (interviewer_notes, MECE
// branches, etc.). Guesstimates instead capture: question, umbrella, 3-level
// segmentation tree, beautiful numbers, final estimate.
//
// Methodology rubric — Soumya Gupta's "How to Solve Guesstimates":
//   1. Umbrella  — pick consumption-side OR production-side; top-down OR bottom-up
//   2. Assumptions — ~3-level segmentation tree
//   3. Numbers — beautiful (round) numbers + percentages for splits
//
// Output schema mirrors the existing `cases` table so insert.ts works as-is.
// `ideal_structure` is the load-bearing field — it captures the umbrella +
// segmentation tree + final estimate so the in-app evaluator can grade
// against it without re-running the LLM.

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildGuesstimateMessages(pageText: string, sourceLabel: string): Msg[] {
  const system = `You convert ONE guesstimate question (with its worked solution) into a structured JSON row.

Output JSON only, exact schema:
{
  "title": string,                       // 6-12 words, descriptive (e.g. "Revenue of a Dentist in Delhi per day")
  "industry": one of ["consulting","fmcg","tech","healthcare","finance","infra","energy","retail","other"],
  "case_type": "estimation",              // ALWAYS "estimation" for guesstimates
  "difficulty": one of ["easy","medium","hard","expert"],
  "source": string | null,                // e.g. "180 Degrees Consulting, SRCC — Guesstimates Vol 1 (Accenture section)"
  "problem_statement": string,            // The question as the interviewer would ask it. Include any constraints/assumptions stated up-front.
  "interviewer_notes": [                   // Reveal-on-question blocks the AI interviewer can drop when the candidate asks
    {"trigger_keywords": string[], "reveal_text": string}
  ],
  "ideal_structure": {
    "framework": string,                   // ONE of: "umbrella-consumption" | "umbrella-production" | "top-down-extrapolation" | "bottom-up-buildup"
    "branches": [                          // The 3-level segmentation tree the solution actually uses. Each top-level branch may have sub-segments.
      {"node": string, "subnodes": string[]}
    ],
    "key_insights": string[]               // The "beautiful numbers" used + the final estimate (e.g., "Delhi pop ≈ 20M", "20% are heavy users", "Final: ₹50,000/day")
  },
  "tags": string[]                         // ALWAYS includes "guesstimate". Plus: company tag (e.g. "company-accenture"), volume tag, geography tag if relevant
}

Rules:
- DO NOT INVENT data. If a field is genuinely missing, use null/empty array.
- The text is ONE page from a guesstimate book — it contains the question, assumptions, segmentation, math, and final answer. Extract what's there.
- ${'`'}framework${'`'} is REQUIRED. Pick the closest match based on whether the solution starts from end-customer behavior (consumption), supply-side (production), country→city allocation (top-down), or per-unit→total (bottom-up).
- ${'`'}branches${'`'} should faithfully reflect the solution's segmentation. If the solution splits "people" into "age groups → consumer types → frequency", that's three levels: top-level node "people", subnodes ["age groups", "consumer types", "frequency"]. Or use multiple top-level nodes for parallel segmentations.
- ${'`'}key_insights${'`'} should contain the round numbers + final answer. Format examples: "Delhi pop ≈ 20M", "60% adults", "Final: 4M cabs/day".
- ${'`'}interviewer_notes${'`'} should anticipate clarifying questions a candidate might ask (e.g. "what city?", "which time of day?", "do we count online vs offline?"). Each note: 3-6 short trigger noun phrases + a 1-line reveal_text.
- Difficulty: easy = single segmentation, hard = multi-step + assumptions stack, expert = unusual edge cases or non-obvious framing. Use the book's "Level" cue if present.
- If the page is NOT a guesstimate (cover, index, theory pages, "thank you" page, team credits) → return {"title": null} and nothing else. The orchestrator will skip it.

Return JSON only.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `SOURCE LABEL: ${sourceLabel}\n\nPAGE TEXT:\n\n${pageText.slice(0, 6000)}\n\nReturn JSON only.` },
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
    // 8b-instant — free-tier RPM is much higher than 70b, and the
    // extraction task (filling a fixed schema from a single page) is
    // structured enough that 8b handles it. Match the rest of the
    // ingestion pipeline.
    model = 'llama-3.1-8b-instant';
  }
  return { url, model, key };
}

export async function extractGuesstimate(
  pageText: string,
  sourceLabel: string
): Promise<Record<string, unknown> | null> {
  const messages = buildGuesstimateMessages(pageText, sourceLabel);
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
      const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data?.choices?.[0]?.message?.content || '{}';
      try { return JSON.parse(content); } catch { return null; }
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  return null;
}
