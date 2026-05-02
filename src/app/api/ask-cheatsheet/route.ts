import { NextRequest, NextResponse } from 'next/server';
import { completeChat } from '@/lib/llm-router';
import { TRACKS, type Track } from '@/lib/tracks';
import { tavilySearch } from '@/lib/research/tavily';

// Q&A endpoint — answers questions using the track's frameworks/math/recovery
// content + light web research, grounded in user's weak-area history.
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const q = body?.q;
  const trackKey = body?.track;
  const weakestDims = body?.weakestDims;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return NextResponse.json({ error: 'q (non-empty string) required' }, { status: 400 });
  }
  if (q.length > 2000) {
    return NextResponse.json({ error: 'q too large (>2000 chars)' }, { status: 413 });
  }
  if (trackKey !== undefined && (typeof trackKey !== 'string' || !(trackKey in TRACKS))) {
    return NextResponse.json({ error: 'track must be a valid track key' }, { status: 400 });
  }
  if (weakestDims !== undefined && weakestDims !== null && !Array.isArray(weakestDims)) {
    return NextResponse.json({ error: 'weakestDims must be an array of strings' }, { status: 400 });
  }
  const safeWeakestDims: string[] = Array.isArray(weakestDims)
    ? weakestDims.filter((d: unknown) => typeof d === 'string').slice(0, 20).map((d: string) => d.slice(0, 100))
    : [];

  const track: Track = (trackKey as Track) || 'consulting';
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
- The candidate's weak areas: ${safeWeakestDims.join(', ') || '(no history)'}

Rules:
- Concrete and specific. Cite framework name when invoked.
- If the candidate has a known weak area relevant to the question, address it explicitly.
- Use the web research below if it adds real numbers/facts.
- Max 250 words.`;

  const user = `QUESTION: ${q}
${research ? `\nWEB RESEARCH SNIPPET:\n${research}` : ''}\n\nAnswer.`;

  let answer: string;
  try {
    answer = await completeChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });
  } catch {
    return NextResponse.json({ error: 'all providers failed' }, { status: 502 });
  }

  return NextResponse.json({ answer: answer || 'No answer.' });
}
