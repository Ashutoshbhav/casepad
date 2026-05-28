import { NextRequest, NextResponse } from 'next/server';
import { completeChat } from '@/lib/llm-router';
import { gateRequest } from '@/lib/api/gate';

export async function POST(req: NextRequest) {
  // Auth + per-user rate-limit. Pre-launch this route was open + uncapped —
  // a single anonymous caller could burn Groq quota by hammering it.
  const gate = await gateRequest({ routeName: 'behavioral-feedback', perUserPerMinute: 30 });
  if (!gate.ok) return gate.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const q = body?.q;
  const response = body?.response;
  if (!q || typeof q !== 'object' || Array.isArray(q) || typeof q.prompt !== 'string' || typeof q.dimension !== 'string') {
    return NextResponse.json({ error: 'q must be an object with prompt (string) + dimension (string)' }, { status: 400 });
  }
  if (q.prompt.length > 2000 || q.dimension.length > 200) {
    return NextResponse.json({ error: 'q.prompt or q.dimension too large' }, { status: 413 });
  }
  if (!response || typeof response !== 'string' || response.length < 50) {
    return NextResponse.json({ error: 'response (string, ≥50 chars) required' }, { status: 400 });
  }
  if (response.length > 5000) {
    return NextResponse.json({ error: 'response too large (>5000 chars)' }, { status: 413 });
  }
  // Coerce optional metadata strings used in the prompt template
  const commonMistake = typeof q.common_mistake === 'string' ? q.common_mistake.slice(0, 1000) : '';
  const spikeMove = typeof q.spike_move === 'string' ? q.spike_move.slice(0, 1000) : '';

  const system = `You are a behavioral interview coach. Score the candidate's STAR-format
response against this rubric:
- star_structure (out of 25): is Situation/Task/Action/Result clearly told?
- specificity (out of 20): concrete numbers, names, outcomes vs vague?
- self_awareness (out of 15): honest reflection on what they learned / would do differently?
- relevance (out of 15): does the story actually match the dimension being tested?
- authenticity (out of 15): sounds personal vs rehearsed/canned?
- impact (out of 10): outcome was meaningful, not trivial?

Total = sum of dimensions, max 100.

Output JSON only:
{
  "total_score": <0-100>,
  "dimensions": {
    "star_structure": <0-25>,
    "specificity": <0-20>,
    "self_awareness": <0-15>,
    "relevance": <0-15>,
    "authenticity": <0-15>,
    "impact": <0-10>
  },
  "strengths": [<2-3 specific things they did well, citing the response>],
  "gaps": [<2-3 specific things to improve, citing what was missing or weak>],
  "rewritten_excerpt": <1-paragraph rewrite of the weakest section showing what better looks like, OR null if response was solid>
}

Rules:
- Cite phrases from the response, don't be generic.
- A 90+ requires concrete numbers, named people/situations, AND a moment of self-awareness.
- Below 60 = significant gap (no STAR structure, or pure generality, or a humblebrag instead of real story).
- "Common mistake" for this question: ${commonMistake}. Specifically check whether they fell into it.
- "Spike move" for this question: ${spikeMove}. Did they execute it?`;

  const user = `BEHAVIORAL QUESTION: ${q.prompt}
DIMENSION: ${q.dimension}

CANDIDATE RESPONSE:
${response}

Score it.`;

  let raw: string;
  try {
    raw = await completeChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      json: true,
      temperature: 0.2,
      max_tokens: 1200,
    });
  } catch {
    return NextResponse.json({ error: 'all providers failed' }, { status: 502 });
  }

  let feedback;
  try { feedback = JSON.parse(raw || '{}'); }
  catch { return NextResponse.json({ error: 'feedback parse failed' }, { status: 502 }); }

  return NextResponse.json({ feedback });
}
