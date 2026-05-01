import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { TRACKS, type Track } from '@/lib/tracks';
import { tavilySearch } from '@/lib/research/tavily';

// Q&A endpoint — answers questions using the track's frameworks/math/recovery
// content + light web research, grounded in user's weak-area history.
export async function POST(req: NextRequest) {
  const { q, track: trackKey, weakestDims } = await req.json();
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

  const track: Track = trackKey || 'consulting';
  const def = TRACKS[track];

  // Light research — single Tavily query to enrich answer
  let research = '';
  try {
    const r = await tavilySearch(q, { max_results: 3 });
    research = (r.answer || '').slice(0, 500);
  } catch {}

  const system = `You are a personal case-prep coach for a ${def.label} candidate.
Answer the question using:
- The track's frameworks: ${def.frameworks.map((f) => f.name).join(', ')}
- The track's math: ${def.math.map((m) => m.name).join(', ')}
- Recovery scripts: available
- The candidate's weak areas: ${(weakestDims || []).join(', ') || '(no history)'}

Rules:
- Concrete and specific. Cite framework name when invoked.
- If the candidate has a known weak area relevant to the question, address it explicitly.
- Use the web research below if it adds real numbers/facts.
- Max 250 words.`;

  const user = `QUESTION: ${q}
${research ? `\nWEB RESEARCH SNIPPET:\n${research}` : ''}\n\nAnswer.`;

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const answer = completion.choices[0].message.content || 'No answer.';
  return NextResponse.json({ answer });
}
