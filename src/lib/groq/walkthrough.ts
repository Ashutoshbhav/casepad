import { groq, MODEL_LARGE } from './client';
import { researchCase } from '../research/tavily';

export interface IdealWalkthrough {
  issue_tree: {
    root_question: string;
    branches: { node: string; subnodes: string[] }[];
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
  interviewerNotes: any[]
): Promise<IdealWalkthrough | null> {
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
    "branches": [{"node": string, "subnodes": [string]}]
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
- issue_tree decomposes the root question into MECE branches with concrete subnodes.
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

IDEAL STRUCTURE (from casebook):
${JSON.stringify(idealStructure, null, 2)}

INTERVIEWER REVEAL DATA (what gets uncovered when asked):
${JSON.stringify((interviewerNotes || []).slice(0, 8), null, 2)}

WEB RESEARCH (real-world context to ground your walkthrough in):
${research || '(no research available — ground in case data only)'}

Generate the ideal walkthrough JSON. Remember: every evidence/reasoning point MUST cite either case data or web research — no MBB-cliche generics.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_LARGE,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
    });
    const content = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(content) as IdealWalkthrough;
    // Attach the web sources we used so the UI can cite them.
    if (sources.length > 0) parsed.sources = sources;
    return parsed;
  } catch (err) {
    console.error('walkthrough generation failed:', (err as Error).message);
    return null;
  }
}
