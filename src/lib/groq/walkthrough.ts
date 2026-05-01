import { groq, MODEL_LARGE } from './client';

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
}

export async function generateIdealWalkthrough(
  title: string,
  problemStatement: string,
  idealStructure: any,
  interviewerNotes: any[]
): Promise<IdealWalkthrough | null> {
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
- DO NOT INVENT data not in the problem statement. If specific numbers aren't given, leave evidence general.
- Use the case's actual context (title, problem, ideal structure, reveal data) to ground every output.`;

  const user = `CASE TITLE: ${title}

PROBLEM STATEMENT:
${problemStatement}

IDEAL STRUCTURE (from casebook):
${JSON.stringify(idealStructure, null, 2)}

INTERVIEWER REVEAL DATA (what gets uncovered when asked):
${JSON.stringify((interviewerNotes || []).slice(0, 8), null, 2)}

Generate the ideal walkthrough JSON.`;

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
    return JSON.parse(content) as IdealWalkthrough;
  } catch (err) {
    console.error('walkthrough generation failed:', (err as Error).message);
    return null;
  }
}
