// Issue/hypothesis tree extractor — reads the chat transcript turn-by-turn
// and infers an MECE-structured tree of how the candidate is decomposing the
// case. Runs after every interviewer response so the user watches it fill.
//
// The output is loose JSONB on the session row. We pass the prior tree back
// into the LLM so it can extend rather than restart, keeping continuity.

import { completeChat } from '../llm-router';
import { staticIssueTreeFallback } from './static-fallbacks';

export interface TreeNode {
  id: string;
  label: string;
  parent_id: string | null;
  level: number;
  hypothesis?: string;
  mece_warning?: string;
}

export interface IssueTree {
  nodes: TreeNode[];
  rubric: {
    mece: number;
    depth_balance: number;
    hypothesis_attached: number;
    driven_from_issue: number;
  };
  last_updated_turn: number;
}

const EMPTY_TREE: IssueTree = {
  nodes: [],
  rubric: { mece: 0, depth_balance: 0, hypothesis_attached: 0, driven_from_issue: 0 },
  last_updated_turn: 0,
};

const SYSTEM = `You watch a case-interview transcript and infer the candidate's issue/hypothesis tree as they think aloud.

A real case-interview tree looks like this (example: profitability case):
- L0: ROOT ("Why is profit declining?")
  - L1: Revenue
    - L2: Volume
      - L3: New customers
      - L3: Existing customers
    - L2: Price
  - L1: Cost
    - L2: Fixed
    - L2: Variable
- Each node has a "label" (short noun phrase, max 5 words).
- Hypotheses are attached to LEAF nodes (e.g., "Existing customers churning to a cheaper competitor").
- Levels are measured from L0 (the root question itself).
- A non-MECE branch is one with overlapping siblings, missing siblings, or a single child where the parent should split.

Your job: extract or update the tree from the transcript. The candidate's USER turns are the source of structure. Interviewer turns are context.

Output JSON only:
{
  "nodes": [
    { "id": "string", "label": "string", "parent_id": "string|null", "level": 0..6, "hypothesis": "string|null", "mece_warning": "string|null" }
  ],
  "rubric": {
    "mece": 0-100,                   // Are siblings non-overlapping & exhaustive?
    "depth_balance": 0-100,           // Is depth roughly even across L1 branches, or one branch is L4 and another L1?
    "hypothesis_attached": 0-100,    // % of leaf nodes that have a hypothesis
    "driven_from_issue": 0-100       // Did candidate start from a clear root question and drill down, vs jumping to detail?
  }
}

Rules:
- IDs: use stable short slugs (e.g., "root", "revenue", "volume", "existing-cust"). Re-use prior IDs from the prior_tree where possible.
- If candidate has barely structured anything, return a minimal tree (just the root + 1-2 branches if mentioned).
- mece_warning is optional, only set when you detect a real problem (e.g., "L1 has only 1 child — non-MECE", "Revenue branch missing Volume side").
- Be conservative: don't invent nodes the candidate hasn't actually mentioned or implied.
- Update the prior tree incrementally — if a new node was added, append; if candidate restructured, restructure.
- Keep nodes <= 25. Real case trees rarely exceed this.`;

export async function extractIssueTree(
  caseTitle: string,
  problemStatement: string,
  transcript: { role: 'user' | 'interviewer'; content: string }[],
  priorTree: IssueTree | null
): Promise<IssueTree> {
  if (transcript.length === 0) return priorTree ?? EMPTY_TREE;

  const tail = transcript.slice(-12); // most recent 12 turns
  const transcriptText = tail
    .map((t) => `[${t.role.toUpperCase()}] ${t.content}`)
    .join('\n\n');

  const prior = priorTree ?? EMPTY_TREE;
  const userMsg = `CASE: ${caseTitle}
PROMPT: ${problemStatement.slice(0, 500)}

PRIOR_TREE (extend or restructure):
${JSON.stringify(prior, null, 2)}

TRANSCRIPT (last ${tail.length} turns):
${transcriptText}

Return the updated issue_tree JSON.`;

  let raw: string;
  try {
    raw = await completeChat({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      json: true,
      temperature: 0.2,
      max_tokens: 1400,
    });
  } catch (err) {
    console.warn('[issue-tree] all providers failed:', (err as Error).message);
    // If we had a prior tree, preserve it (better than fallback). Otherwise
    // surface the static fallback so the panel renders something instead of
    // crashing or showing "Empty".
    return prior.nodes.length > 0 ? prior : staticIssueTreeFallback();
  }

  let parsed: any;
  try { parsed = JSON.parse(raw); }
  catch {
    return prior.nodes.length > 0 ? prior : staticIssueTreeFallback();
  }

  // Defensive normalization
  const nodes: TreeNode[] = Array.isArray(parsed.nodes) ? parsed.nodes
    .filter((n: any) => n && typeof n.id === 'string' && typeof n.label === 'string')
    .slice(0, 30)
    .map((n: any) => ({
      id: String(n.id),
      label: String(n.label).slice(0, 80),
      parent_id: n.parent_id ? String(n.parent_id) : null,
      level: typeof n.level === 'number' ? Math.max(0, Math.min(6, n.level)) : 0,
      hypothesis: typeof n.hypothesis === 'string' ? n.hypothesis.slice(0, 240) : undefined,
      mece_warning: typeof n.mece_warning === 'string' ? n.mece_warning.slice(0, 200) : undefined,
    })) : [];

  const rubric = {
    mece: Math.max(0, Math.min(100, Number(parsed?.rubric?.mece ?? 0))),
    depth_balance: Math.max(0, Math.min(100, Number(parsed?.rubric?.depth_balance ?? 0))),
    hypothesis_attached: Math.max(0, Math.min(100, Number(parsed?.rubric?.hypothesis_attached ?? 0))),
    driven_from_issue: Math.max(0, Math.min(100, Number(parsed?.rubric?.driven_from_issue ?? 0))),
  };

  return { nodes, rubric, last_updated_turn: transcript.length };
}
