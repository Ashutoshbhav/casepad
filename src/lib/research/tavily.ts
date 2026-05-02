// Tavily web search wrapper. Used to ground the ideal-walkthrough generator
// in real-world facts about the company / industry / problem so output isn't
// generic LLM slop. Free tier: 1000 queries/month — see ./tavily-quota for the
// soft-cap guard that wraps these calls.

import { canCallTavily, incrementTavilyQuota } from './tavily-quota';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
}

// Sentinel returned when the monthly quota is exhausted. Callers that don't
// want to special-case this can just treat it as an empty result set.
function emptyTavilyResponse(query: string): TavilyResponse {
  return { query, answer: undefined, results: [] };
}

export async function tavilySearch(
  query: string,
  opts?: { max_results?: number; depth?: 'basic' | 'advanced' }
): Promise<TavilyResponse> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error('TAVILY_API_KEY not set');

  // Quota gate: if we've burned through the month's soft cap, return an empty
  // result instead of hitting Tavily. Lets the caller fall back to LLM-only
  // grounding without crashing the request.
  const gate = await canCallTavily();
  if (!gate.allowed) {
    console.warn(`[tavily] quota soft-cap reached (count=${gate.count}); skipping query: ${query.slice(0, 80)}`);
    return emptyTavilyResponse(query);
  }

  const r = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: opts?.max_results ?? 5,
      search_depth: opts?.depth ?? 'basic',
      include_answer: 'basic',
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Tavily ${r.status}: ${body.slice(0, 200)}`);
  }
  // Only count successful calls — Tavily doesn't bill failures.
  void incrementTavilyQuota(1);
  return (await r.json()) as TavilyResponse;
}

// Run 3 parallel research queries for a case: company background, industry
// trends, and the specific problem context. Returns a compact research blob
// the LLM can ground its walkthrough in, plus a sources list for citation.
export async function researchCase(
  title: string,
  problemStatement: string
): Promise<{ research: string; sources: { title: string; url: string }[] }> {
  // Up-front quota check: a single researchCase fires 3 parallel Tavily calls.
  // If we're already at the soft cap, short-circuit so we don't even pay the
  // 3x fetch round-trips that we know would all return empty.
  const gate = await canCallTavily();
  if (!gate.allowed) {
    console.warn(`[tavily] researchCase skipped — quota soft-cap reached (count=${gate.count})`);
    return { research: '', sources: [] };
  }

  // Naive entity extraction: take the first proper-noun-ish word in the title
  const company = (title.match(/[A-Z][A-Za-z&\-]{2,}/g) || [])[0] || title.slice(0, 40);
  const queries = [
    `${company} company background business model`,
    `${title} industry market trends`,
    problemStatement.slice(0, 150),
  ];

  const results = await Promise.allSettled(queries.map((q) => tavilySearch(q, { max_results: 3 })));

  const blobs: string[] = [];
  const sources: { title: string; url: string }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status !== 'fulfilled') continue;
    const data = r.value;
    if (data.answer) blobs.push(`Q: ${queries[i]}\nA: ${data.answer.slice(0, 600)}`);
    for (const item of data.results.slice(0, 3)) {
      const snippet = (item.content || '').slice(0, 400);
      if (snippet.length < 50) continue;
      blobs.push(`Source: ${item.title}\n${snippet}`);
      if (!seen.has(item.url)) {
        sources.push({ title: item.title, url: item.url });
        seen.add(item.url);
      }
    }
  }

  return {
    research: blobs.join('\n\n---\n\n').slice(0, 8000),
    sources: sources.slice(0, 10),
  };
}
