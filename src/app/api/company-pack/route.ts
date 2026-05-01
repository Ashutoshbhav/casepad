import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { tavilySearch } from '@/lib/research/tavily';
import { TRACKS, type Track } from '@/lib/tracks';

// Generates a Company-Specific Pre-Interview Pack: pulls Glassdoor/WSO/PrepLounge
// reports for the firm, identifies recent case archetypes, surfaces user's
// weak areas to drill, and generates a 24-hour-before crammer.
export async function POST(req: NextRequest) {
  const { firm, location, round } = await req.json();
  if (!firm) return NextResponse.json({ error: 'firm required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user_msg },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1500,
  });

  let pack;
  try { pack = JSON.parse(completion.choices[0].message.content || '{}'); }
  catch { return NextResponse.json({ error: 'pack generation failed' }, { status: 500 }); }

  return NextResponse.json({ pack });
}
