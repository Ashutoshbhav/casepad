// src/lib/case-state/number-registry.ts
//
// Number Registry — anti-flip-flop pattern for the AI interviewer.
// Per docs/research/LLM-MATH-RELIABILITY.md, closest published analog: StateAct
// (arxiv 2410.02810).
//
// Why: Llama 3.3-70b drifts on relational reasoning starting around 2-2.5K
// tokens (arxiv 2510.03611), well before its 128K nominal window. Committed
// numbers buried mid-context get forgotten. Solution: extract committed
// numbers into a typed registry, re-inject at TOP and BOTTOM of system prompt
// every turn. Same approach Khanmigo used to fix their identical flip-flop bug.
//
// In-memory only for v1 — recomputed from transcript per turn. ~5ms compute.
// Persistence (committed_numbers JSONB column) is a v2 concern.

export interface NumberCommit {
  /** Lowercased canonical metric name, e.g. "buyers", "annual_revenue", "payback_years" */
  metric: string;
  /** The display value as it appeared in the source turn ("125,000", "$188K", "3 years") */
  display: string;
  /** Normalized numeric value for comparison (always in base unit) */
  numeric: number;
  /** Source unit/scale label */
  unit: string;
  /** Turn index where committed */
  turn: number;
  /** Who said it: 'interviewer' (committed by Ash) or 'user' (proposed by candidate) */
  source: 'interviewer' | 'user';
}

export interface Registry {
  commits: NumberCommit[];
  /** Map of metric → most-recent commit (the "current" value for that metric) */
  current: Map<string, NumberCommit>;
}

interface Turn {
  role: string;
  content: string;
}

/**
 * Extract numbered claims from a single text. Returns potential commits with
 * their display, numeric, unit. Best-effort regex — false positives are OK
 * (the LLM will see them and ignore irrelevant ones); false negatives are bad.
 */
export function extractNumbers(text: string, turnIndex: number, source: 'interviewer' | 'user'): NumberCommit[] {
  const commits: NumberCommit[] = [];
  if (!text || typeof text !== 'string') return commits;

  // Pattern: optional $/€/₹ + digits with commas/decimals + optional K/M/B/% + optional unit word
  const re = /(\$|€|₹)?\s*([\d,]+(?:\.\d+)?)\s*(K|M|B|MM|million|thousand|billion|crore|lakh|%)?\s*(buyers?|copies|customers?|users?|adults?|people|persons?|companies|firms?|stores?|outlets?|years?|months?|days?|weeks?|hours?|minutes?|seconds?|revenue|costs?|profit|margin|share|price|payback|growth|sales|units?|orders?|tickets?|seats?|flights?|passengers?|households?|employees?|visitors?|sessions?|turns?|km|miles|metres?|meters?|kg|tons?|tonnes?|litres?|liters?|gallons?)?/gi;

  let m;
  while ((m = re.exec(text)) !== null) {
    const currency = m[1] || '';
    const rawNum = m[2];
    const scaleStr = (m[3] || '').toLowerCase();
    const unitStr = (m[4] || '').toLowerCase();

    if (!rawNum) continue;
    // Skip lone year-of-the-world numbers (e.g. "2026") that aren't case data
    if (!scaleStr && !unitStr && !currency && /^(19|20)\d{2}$/.test(rawNum)) continue;
    // Skip bare 1-2 digit numbers without scale or unit (likely turn indices, list items, etc)
    if (!scaleStr && !unitStr && !currency && rawNum.replace(/[,\.]/g, '').length <= 2) continue;

    const numericBase = parseFloat(rawNum.replace(/,/g, ''));
    if (Number.isNaN(numericBase)) continue;

    const scaleMultiplier = (() => {
      switch (scaleStr) {
        case 'k': case 'thousand': return 1_000;
        case 'm': case 'mm': case 'million': return 1_000_000;
        case 'b': case 'billion': return 1_000_000_000;
        case 'crore': return 10_000_000;
        case 'lakh': return 100_000;
        case '%': return 0.01;
        default: return 1;
      }
    })();
    const numeric = numericBase * scaleMultiplier;

    // Canonical metric: combine unit + currency to a single key
    const metric = canonicalMetric(unitStr, currency, scaleStr);
    if (!metric) continue;

    const display = (currency + (rawNum + (scaleStr || '') + (unitStr ? ' ' + unitStr : ''))).trim();
    const unit = unitStr || (scaleStr === '%' ? 'percent' : currency ? 'currency' : 'unitless');

    commits.push({ metric, display, numeric, unit, turn: turnIndex, source });
  }

  return commits;
}

function canonicalMetric(unit: string, currency: string, scale: string): string | null {
  if (unit) {
    // Pluralize-aware normalization
    return unit.replace(/s$/, ''); // "buyers" → "buyer"
  }
  if (currency) return 'currency_amount';
  if (scale === '%') return 'percent';
  return null; // bare number — skip (too noisy)
}

/**
 * Build a registry from a transcript. Walks every turn in order, accumulating
 * commits. The "current" map holds the LATEST commit per metric (most recent
 * wins) — useful for showing the LLM what value to honor going forward.
 */
export function buildRegistry(transcript: Turn[]): Registry {
  const commits: NumberCommit[] = [];
  const current = new Map<string, NumberCommit>();
  transcript.forEach((t, i) => {
    const source: 'interviewer' | 'user' = t.role === 'interviewer' ? 'interviewer' : 'user';
    const turnCommits = extractNumbers(t.content, i, source);
    for (const c of turnCommits) {
      commits.push(c);
      current.set(c.metric, c);
    }
  });
  return { commits, current };
}

/**
 * Render the registry as a system-prompt block. Per the research, this gets
 * injected at the END of the system prompt (highest-attention zone for
 * Llama 3.3-70b's instruction adherence) AND optionally a shorter version
 * at the top.
 *
 * Returns empty string if registry is empty so we don't waste tokens on
 * sessions that haven't generated numbers yet.
 */
export function toSystemPromptBlock(registry: Registry): string {
  if (registry.current.size === 0) return '';

  const lines: string[] = [];
  // Sort by turn descending (most recent first — those matter most)
  const sortedCommits = [...registry.current.values()].sort((a, b) => b.turn - a.turn);

  for (const c of sortedCommits.slice(0, 12)) { // cap at 12 metrics to stay within budget
    const sourceTag = c.source === 'interviewer' ? '[Ash committed]' : '[candidate proposed]';
    lines.push(`  ${c.metric}: ${c.display} (turn ${c.turn}, ${sourceTag})`);
  }

  return `\n\n== NUMBER REGISTRY (MUST honor — do NOT introduce different values for these metrics without an explicit "I was wrong earlier" correction) ==\n${lines.join('\n')}\n== END REGISTRY ==`;
}

/**
 * Detect inconsistencies in a draft response against the registry.
 * Returns an array of problems (empty if clean).
 *
 * Used by the deterministic critic — if the draft contradicts a committed
 * number for the same metric without an explicit correction, regen.
 */
export interface RegistryViolation {
  metric: string;
  registered: NumberCommit;
  draft_value: string;
  evidence: string;
}

export function checkDraftAgainstRegistry(
  draft: string,
  registry: Registry,
  draftTurnIndex: number
): RegistryViolation[] {
  const violations: RegistryViolation[] = [];
  if (registry.current.size === 0) return violations;
  const draftCommits = extractNumbers(draft, draftTurnIndex, 'interviewer');

  // If the draft acknowledges a correction explicitly, allow value changes
  const allowChange = /\bi\s*was\s*wrong\b|\b(correction|earlier mistake|let me correct|actually,?\s*the\s*correct)\b/i.test(draft);
  if (allowChange) return violations;

  for (const dc of draftCommits) {
    const reg = registry.current.get(dc.metric);
    if (!reg) continue;
    if (Math.abs(reg.numeric - dc.numeric) < 1e-6) continue; // same value, OK
    // Tolerate 5% rounding drift
    const tolerance = Math.max(Math.abs(reg.numeric) * 0.05, 1);
    if (Math.abs(reg.numeric - dc.numeric) <= tolerance) continue;
    violations.push({
      metric: dc.metric,
      registered: reg,
      draft_value: dc.display,
      evidence: `Draft says "${dc.display}" for metric "${dc.metric}" — but turn ${reg.turn} committed "${reg.display}"`,
    });
  }
  return violations;
}
