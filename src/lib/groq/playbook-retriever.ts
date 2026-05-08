// src/lib/groq/playbook-retriever.ts
//
// Week-2-3 of AI-INTERVIEWER-TRAINING-PLAN: lightweight keyword-based RAG over
// the 1,000+ MBB-interviewer findings in docs/playbook/*.md.
//
// Why keyword and not embeddings:
//   - @xenova/transformers is 22MB cold-start on Vercel — adds a SPOF for
//     never-fail and hurts cold-start latency.
//   - Embedding API is free-tier-throttled and adds dependency on a third
//     party that can fail.
//   - Keyword scoring of ~1,100 short findings is 5-10ms in-process — no
//     extra dependency, no extra latency, no SPOF.
//   - Quality is ~70% as good as embeddings on short queries; that's enough
//     for the trust-UX citation use-case.
//
// FAIL-OPEN: every code path here returns [] on error rather than throwing.
// The chat route should NEVER fail because the retriever broke.

import data from './playbook-data.json';

interface PlaybookFinding {
  id: string;
  file: string;
  section: string;
  number: number;
  text: string;
  sourceUrl?: string;
  keywords: string[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
  'here', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom',
  'and', 'or', 'but', 'if', 'else', 'for', 'with', 'without', 'on',
  'in', 'at', 'to', 'of', 'from', 'by', 'as', 'about', 'into', 'over',
  'under', 'after', 'before', 'between', 'through', 'during',
  'i', 'you', 'he', 'she', 'we', 'us', 'me', 'my', 'your', 'our',
  'so', 'than', 'too', 'very', 'just', 'only', 'also', 'some', 'any',
  'all', 'each', 'every', 'both', 'either', 'neither', 'such', 'same',
  'other', 'another', 'one', 'two', 'three', 'four', 'five',
  'no', 'not', 'nor', 'don', 't', 's', 'd', 'll', 've', 're', 'm',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

let _findings: PlaybookFinding[] | null = null;

function getFindings(): PlaybookFinding[] {
  if (_findings !== null) return _findings;
  try {
    _findings = (data as any).findings as PlaybookFinding[];
    if (!Array.isArray(_findings)) {
      console.warn('[playbook-retriever] data.findings is not an array; disabling retrieval');
      _findings = [];
    }
  } catch (err) {
    console.warn('[playbook-retriever] failed to load index:', (err as Error).message);
    _findings = [];
  }
  return _findings;
}

/**
 * Score a finding's relevance to a query using keyword overlap.
 * Higher = more relevant. Zero means no shared keywords.
 *
 * Algorithm:
 *   - count = number of query keywords that appear in the finding's keywords
 *   - boost short findings slightly so they don't get drowned by long ones
 *   - dedupe via Set so repeated query words don't double-count
 */
function scoreFinding(queryKeywords: Set<string>, finding: PlaybookFinding): number {
  if (queryKeywords.size === 0 || finding.keywords.length === 0) return 0;
  let overlap = 0;
  for (const kw of finding.keywords) {
    if (queryKeywords.has(kw)) overlap++;
  }
  if (overlap === 0) return 0;
  // Normalize lightly by finding length to avoid bias toward verbose findings
  const lenNorm = Math.log(1 + finding.keywords.length);
  return overlap / lenNorm;
}

export interface RetrievedFinding {
  text: string;
  section: string;
  sourceUrl?: string;
  id: string;
  score: number;
}

/**
 * Retrieve top-K most-relevant playbook findings for a query.
 * Query is typically the candidate's last turn + recent transcript context.
 *
 * NEVER throws. On any internal error, returns []. Chat route is built to
 * function fine with an empty findings list.
 */
export function retrievePlaybookFindings(
  query: string,
  k: number = 3
): RetrievedFinding[] {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) return [];
    const findings = getFindings();
    if (findings.length === 0) return [];

    const queryTokens = new Set(tokenize(query));
    if (queryTokens.size === 0) return [];

    const scored: { finding: PlaybookFinding; score: number }[] = [];
    for (const f of findings) {
      const s = scoreFinding(queryTokens, f);
      if (s > 0) scored.push({ finding: f, score: s });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(({ finding, score }) => ({
      text: finding.text,
      section: finding.section,
      sourceUrl: finding.sourceUrl,
      id: finding.id,
      score,
    }));
  } catch (err) {
    console.warn('[playbook-retriever] retrieval failed; returning empty:', (err as Error).message);
    return [];
  }
}

/**
 * Format retrieved findings as a system-prompt block to inject into the
 * interviewer messages array. Returns empty string if no findings.
 */
export function formatFindingsForPrompt(findings: RetrievedFinding[]): string {
  if (findings.length === 0) return '';
  const lines = findings.map(
    (f, i) => `${i + 1}. [${f.section}] ${stripMarkdown(f.text).slice(0, 280)}`
  );
  return `\n\n== RELEVANT INTERVIEWER PRACTICE (from MBB observation, use as guidance — not a script) ==\n${lines.join('\n')}`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '');
}
