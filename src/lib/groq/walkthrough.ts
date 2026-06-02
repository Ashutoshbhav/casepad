import { completeChat } from '../llm-router';
import { researchCase } from '../research/tavily';
import { staticWalkthroughFallback } from './static-fallbacks';
import { renderDossierBlock, dossierIsUsable } from './dossier-context';
import { renderPlaybook } from './ideal-answer-playbooks';

// Bump when the generator's prompt/inputs change materially. The debrief
// regenerates any cached walkthrough whose generator_version is below this,
// so stale generic walkthroughs get replaced on the next view.
// v2: dossier + case-type framework anchor. v3: full 21-playbook synthesis
// (anatomy + spike moves + anti-slop + L0-L4 depth) injected per case type.
// v4: deep recursive issue tree (3-5 levels) instead of a flat 2-level skeleton.
// v5: per-node "note" (the assumption/reasoning for exploring/prioritizing it).
export const WALKTHROUGH_GENERATOR_VERSION = 5;

// Canonical case types (mirror cases.case_type) → the framework a top
// candidate would actually use. Fixes the "Porter's 5 Forces on a
// profitability case" mismatch by anchoring the model to the right tree.
export type CaseType =
  | 'profitability' | 'market_entry' | 'pricing' | 'mna'
  | 'operations' | 'estimation' | 'growth_metrics' | 'product_design'
  | 'behavioral' | 'unknown';

export function inferCaseType(title: string, problem: string): CaseType {
  const s = `${title} ${problem}`.toLowerCase();
  if (/\b(profit|margin|bottom line|losing money|earnings)\b/.test(s) || /(declin|fall|drop).*(profit|margin|earnings)/.test(s)) return 'profitability';
  if (/\b(acqui|merger|m&a|takeover|divest|joint venture)\b/.test(s)) return 'mna';
  if (/\b(pric|pricing|charge|willingness to pay)\b/.test(s)) return 'pricing';
  if (/\b(enter|expansion|expand|new market|go to market|launch in)\b/.test(s)) return 'market_entry';
  if (/\b(estimate|guesstimate|market siz|size the|how many)\b/.test(s)) return 'estimation';
  if (/\b(throughput|capacity|bottleneck|cycle time|defect|utiliz|supply chain|operational)\b/.test(s)) return 'operations';
  if (/\b(metric|engagement|retention|churn|uninstall|add[- ]to[- ]cart|funnel|dau|mau|root cause)\b/.test(s) || /(drop|declin|fall).*(users?|sessions?|usage|engagement|sales)/.test(s)) return 'growth_metrics';
  if (/\b(design (a|an)|build (a|an)|create (a|an)).*(app|product|feature)|product for\b/.test(s)) return 'product_design';
  if (/\b(tell me about a time|leadership|conflict|why (consulting|this firm)|walk me through your)\b/.test(s)) return 'behavioral';
  return 'unknown';
}

export function frameworkHintForCaseType(t: CaseType): string {
  switch (t) {
    case 'profitability': return 'Profitability tree: Profit = Revenue (Price × Volume) − Cost (Fixed + Variable). Decompose which side moved and why. Do NOT use Porter\'s 5 Forces or a generic market-attractiveness framework here.';
    case 'market_entry': return 'Market attractiveness (size, growth, margins) → Company fit/capabilities → Entry mode (build/buy/partner) → Risks & economics.';
    case 'pricing': return 'Cost-based vs competitor-based vs value-based pricing; willingness-to-pay by segment; price elasticity; cannibalization.';
    case 'mna': return 'Strategic fit → Financial fit/valuation → Synergies (revenue + cost) → Integration risks → Deal-breakers.';
    case 'operations': return 'Process map → Bottlenecks → Utilization/throughput → Quality/defects → Cost-to-serve.';
    case 'estimation': return 'Top-down (population × penetration × usage × price) and/or bottom-up (unit × frequency × scale); STATE every assumption; sanity-check the final number with a defensible range.';
    case 'growth_metrics': return 'Build a DIAGNOSTIC metric tree: internal vs external, new vs existing users, by segment/platform/geo, seasonality. Isolate the root cause, then propose the one metric that would confirm it.';
    case 'product_design': return 'User segments → their pains (grounded in a SPECIFIC persona) → prioritized solutions (impact vs effort) → success metrics. There is no single right answer — score the reasoning.';
    case 'behavioral': return 'STAR structure (Situation, Task, Action, Result). Emphasize the candidate\'s INDIVIDUAL action and a measurable result.';
    default: return 'Pick the framework that fits the ACTUAL question; if the prompt is ambiguous, clarify scope first.';
  }
}

// A recursive issue-tree node — supports 3-5 levels of real depth (was a flat
// 2-level node→subnodes[] before, which made every tree look tiny).
export interface IssueNode {
  label: string;
  note?: string; // short assumption/reasoning: WHY a top candidate explores or prioritizes this node
  children?: IssueNode[];
}

export interface IdealWalkthrough {
  issue_tree: {
    root_question: string;
    branches: IssueNode[];
  };
  hypothesis_tree: {
    primary: string;
    supporting: string[];
  };
  thinking_levels: {
    L0_recommendation: string;
    L1_drivers: string[];
    L2_evidence: string[];
    L3_risks: string[];
    L4_implementation: string[];
  };
  step_by_step: {
    step: number;
    action: string;
    reasoning: string;
    expected_questions?: string[];
  }[];
  sources?: { title: string; url: string }[];
}

export async function generateIdealWalkthrough(
  title: string,
  problemStatement: string,
  idealStructure: any,
  interviewerNotes: any[],
  opts?: { caseType?: string; dossier?: any }
): Promise<IdealWalkthrough | null> {
  // Anchor the model to the RIGHT framework for this case type (the DB
  // case_type is authoritative; fall back to a keyword heuristic). This is
  // what stops "Porter's 5 Forces on a profitability case".
  const caseType: CaseType =
    opts?.caseType && opts.caseType !== 'other'
      ? (opts.caseType as CaseType)
      : inferCaseType(title, problemStatement);
  const frameworkHint = frameworkHintForCaseType(caseType);
  // The distilled top-candidate playbook for this case type (framework +
  // anatomy + spike moves + common mistakes + checklist) plus the always-on
  // expert-answer principles (L0-L4 depth, anti-slop, India grounding).
  const playbookBlock = renderPlaybook(caseType);

  // The per-case dossier is the deep, expert-level knowledge (real numbers,
  // common mistakes, anticipated Q&A). Feeding it in is the single biggest
  // quality lever — without it the walkthrough recites textbook skeletons.
  const dossierBlock =
    opts?.dossier && dossierIsUsable(opts.dossier) ? renderDossierBlock(opts.dossier) : '';

  // Run web research first so the LLM has real-world facts to ground in,
  // not just whatever the casebook PDF gave us. Falls through gracefully if
  // Tavily key missing or search fails.
  let research = '';
  let sources: { title: string; url: string }[] = [];
  try {
    const r = await researchCase(title, problemStatement);
    research = r.research;
    sources = r.sources;
  } catch (err) {
    console.warn('research skipped:', (err as Error).message);
  }

  const system = `You are a senior consulting interview coach. Given a case, produce
the IDEAL step-by-step solve that a top-percentile MBB candidate would deliver.

Output JSON only with this exact schema:
{
  "issue_tree": {
    "root_question": string,
    "branches": [{"label": string, "note": string, "children": [{"label": string, "note": string, "children": [{"label": string, "note": string}]}]}]
  },
  "hypothesis_tree": {
    "primary": string,
    "supporting": [string]
  },
  "thinking_levels": {
    "L0_recommendation": string,
    "L1_drivers": [string],
    "L2_evidence": [string],
    "L3_risks": [string],
    "L4_implementation": [string]
  },
  "step_by_step": [{"step": number, "action": string, "reasoning": string, "expected_questions": [string]}]
}

Rules:
- PLAYBOOK ADHERENCE: a TOP-CANDIDATE PLAYBOOK + EXPERT-ANSWER PRINCIPLES are given in the user message. Match that quality bar exactly — hit the L0→L4 depth, include the spike moves, avoid the listed common mistakes, and obey the ANTI-SLOP bans (no ungrounded "synergy/leverage/holistic", no hedging, every number sourced or labeled ESTIMATE).
- CASE-TYPE ANCHOR (most important): a CASE TYPE + the correct framework for it is given below. Build the issue_tree on THAT framework. Treat the "IDEAL STRUCTURE (casebook hint)" as a loose hint only — if it names a framework that does not fit the case type (e.g. Porter's 5 Forces on a profitability case), IGNORE it and use the correct one.
- issue_tree: build a DEEP, tailored tree using nested "children" — 3-4 top-level MECE branches, each decomposed 2-3 further levels deep (go DEEPEST on the branch you suspect drives the answer; asymmetric depth is correct). Every node must be a DRIVER of its parent (not a container), concrete and specific to THIS case. Aim for ~12-20 total nodes across the tree, not a 4-node skeleton. A leaf node has no "children".
- EVERY node MUST also carry a short "note" (≤12 words): the ASSUMPTION or reasoning a top candidate would voice for exploring or PRIORITIZING that node over its siblings — e.g. on "Volume": "price is contract-fixed this year, so the drop is volume-led". The notes are the teaching — they show WHY the candidate dug here, not just what. Ground each note in case data / the dossier where possible.
- hypothesis_tree.primary is the candidate's initial hypothesis (one sentence). supporting are 2-4 sub-hypotheses to test.
- Thinking levels go from coarse to fine:
  - L0: one-sentence final recommendation
  - L1: 3-5 top-level drivers
  - L2: specific data points / evidence the case provides
  - L3: 2-4 risks or counter-arguments
  - L4: 2-4 implementation/next-step considerations
- step_by_step has 5-8 steps showing what a strong candidate says at each stage (clarify → decompose → hypothesize → test → recommend).
- ANTI-SLOP RULE: every L2 evidence point and every step's reasoning MUST reference EITHER (a) a specific number/fact from the case data (problem/structure/reveals) OR (b) a specific finding from the WEB RESEARCH below. Generic MBB-cliche statements ("evaluate market attractiveness") without grounding are FORBIDDEN.
- If the web research contradicts the case's premises, prefer the case data — but USE the web research to add real industry numbers, competitor names, and recent context.
- Output must read like it was written by someone who actually researched this company, not someone reciting frameworks.

EDGE CASES:
- If problem statement is too vague (<60 chars or no concrete ask), make the issue tree GENERIC for the implied case type but flag in step 1: "first I'd clarify [specific clarifying question]".
- If the case is a market-sizing / estimation, replace the recommendation step with a numerical answer + range.
- If interviewer notes have a clear "spike" data point (a surprising number), CALL IT OUT in L2 evidence as the key insight.
- For behavioral / fit cases (no business problem), produce a STAR-style breakdown instead of issue tree.
- Never use the words "MECE", "low-hanging fruit", "synergy" without surrounding specificity — these are red-flag cliches when ungrounded.`;

  const user = `CASE TITLE: ${title}

PROBLEM STATEMENT:
${problemStatement}

CASE TYPE: ${caseType}
CORRECT FRAMEWORK FOR THIS CASE TYPE (anchor the issue_tree on this):
${frameworkHint}

${playbookBlock}

IDEAL STRUCTURE (casebook hint — may be mislabeled; defer to the case-type anchor above):
${JSON.stringify(idealStructure, null, 2)}

INTERVIEWER REVEAL DATA (what gets uncovered when asked):
${JSON.stringify((interviewerNotes || []).slice(0, 8), null, 2)}
${dossierBlock ? `\nEXPERT DOSSIER (deep, case-specific knowledge — USE these real numbers, common mistakes, and anticipated Q&A to make the walkthrough concrete and non-generic):\n${dossierBlock}\n` : ''}
WEB RESEARCH (real-world context to ground your walkthrough in):
${research || '(no research available — ground in case data + dossier only)'}

Generate the ideal walkthrough JSON. Remember: anchor on the CASE-TYPE framework, and every evidence/reasoning point MUST cite either case data, the dossier, or web research — no MBB-cliche generics.`;

  try {
    const raw = await completeChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      json: true,
      temperature: 0.2,
      max_tokens: 2500,
    });
    const parsed = JSON.parse(raw || '{}') as IdealWalkthrough & { generator_version?: number };
    // Attach the web sources we used so the UI can cite them.
    if (sources.length > 0) parsed.sources = sources;
    parsed.generator_version = WALKTHROUGH_GENERATOR_VERSION;
    return parsed;
  } catch (err) {
    console.warn('[walkthrough] all providers failed, returning static fallback:', (err as Error).message);
    const fb = staticWalkthroughFallback() as unknown as IdealWalkthrough;
    if (sources.length > 0) fb.sources = sources;
    return fb;
  }
}
