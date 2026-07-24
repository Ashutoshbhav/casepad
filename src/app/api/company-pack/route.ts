import { NextRequest, NextResponse } from 'next/server';
import { completeChat } from '@/lib/llm-router';
import { tavilySearch } from '@/lib/research/tavily';
import { TRACKS, type Track } from '@/lib/tracks';
import { gateRequest } from '@/lib/api/gate';

// Generates a Company-Specific Pre-Interview Pack: pulls Glassdoor/WSO/PrepLounge
// reports for the firm, identifies recent case archetypes, surfaces user's
// weak areas to drill, and generates a 24-hour-before crammer.
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const firm = body?.firm;
  const location = body?.location;
  const round = body?.round;
  if (!firm || typeof firm !== 'string' || firm.trim().length === 0) {
    return NextResponse.json({ error: 'firm (non-empty string) required' }, { status: 400 });
  }
  if (firm.length > 200) {
    return NextResponse.json({ error: 'firm too large (>200 chars)' }, { status: 413 });
  }
  if (location !== undefined && location !== null && (typeof location !== 'string' || location.length > 200)) {
    return NextResponse.json({ error: 'location must be a string ≤200 chars' }, { status: 400 });
  }
  if (round !== undefined && round !== null && (typeof round !== 'string' || round.length > 200)) {
    return NextResponse.json({ error: 'round must be a string ≤200 chars' }, { status: 400 });
  }

  // 3 Tavily queries + 1 Groq generation per call — heaviest route on the
  // surface. Tight 10/min user cap to protect the 1000-query Tavily quota.
  const gate = await gateRequest({ routeName: 'company-pack', perUserPerMinute: 10 });
  if (!gate.ok) return gate.response;
  const { user } = gate;

  const track: Track = (user.user_metadata?.preferred_track as Track) || 'consulting';
  const def = TRACKS[track];

  const queries = [
    `${firm} ${location || ''} interview process recent rounds 2024 2025`,
    `${firm} case interview questions Glassdoor`,
    `${firm} behavioral interview dimensions culture`,
  ];

  const research = (await Promise.allSettled(queries.map((q) => tavilySearch(q, { max_results: 3 }))))
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => (r.value.answer ? `Q: ${r.value.results?.[0]?.title || ''}\n${r.value.answer.slice(0, 400)}` : ''))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 6000);

  const system = `You generate a 24-hour-before interview pack for a ${def.label} candidate interviewing at ${firm}.

Output JSON:
{
  "firm": string,
  "interview_archetypes": [{"name": string, "frequency": "common|sometimes|rare", "what_to_expect": string}],
  "behavioral_focus": [string],
  "case_types_to_drill": [string],
  "math_to_warm_up": [string],
  "spike_phrases_for_this_firm": [string],
  "tonight_checklist": [string],
  "morning_checklist": [string]
}

Rules:
- Ground in the WEB RESEARCH below. Don't invent firm-specific practices.
- case_types_to_drill: pick from frameworks the candidate has: ${def.frameworks.map((f) => f.name).join(', ')}
- behavioral_focus: firm-specific dimensions if research mentions them, else generic.
- Keep checklists concrete (≤8 items each).`;

  const user_msg = `FIRM: ${firm}
LOCATION: ${location || 'unspecified'}
ROUND: ${round || 'unspecified'}

WEB RESEARCH:
${research || '(no research available)'}

Generate the pack JSON.`;

  let raw: string;
  try {
    raw = await completeChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user_msg },
      ],
      json: true,
      temperature: 0.2,
      max_tokens: 1500,
      tier: 'aux', // one-off content generation — see llm-router.ts
    });
  } catch {
    return NextResponse.json({ error: 'all providers failed' }, { status: 502 });
  }

  let pack;
  try { pack = JSON.parse(raw || '{}'); }
  catch { return NextResponse.json({ error: 'pack generation failed' }, { status: 502 }); }

  return NextResponse.json({ pack });
}
