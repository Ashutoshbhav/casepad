import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';

export async function POST(req: NextRequest) {
  const { q, response } = await req.json();
  if (!q || !response || response.length < 50) {
    return NextResponse.json({ error: 'q and response (≥50 chars) required' }, { status: 400 });
  }

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
- "Common mistake" for this question: ${q.common_mistake}. Specifically check whether they fell into it.
- "Spike move" for this question: ${q.spike_move}. Did they execute it?`;

  const user = `BEHAVIORAL QUESTION: ${q.prompt}
DIMENSION: ${q.dimension}

CANDIDATE RESPONSE:
${response}

Score it.`;

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1200,
  });

  let feedback;
  try { feedback = JSON.parse(completion.choices[0].message.content || '{}'); }
  catch { return NextResponse.json({ error: 'feedback parse failed' }, { status: 500 }); }

  return NextResponse.json({ feedback });
}
