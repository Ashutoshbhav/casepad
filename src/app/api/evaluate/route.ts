import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { buildEvaluatorMessages } from '@/lib/groq/evaluator';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

  const { data: caseRow } = await supabase
    .from('cases')
    .select('ideal_structure')
    .eq('id', session.case_id)
    .single();

  const { data: cheatSheet } = await supabase
    .from('cheat_sheets')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  const startMs = new Date(session.started_at).getTime();
  const elapsedSec = Math.round((Date.now() - startMs) / 1000);

  const messages = buildEvaluatorMessages(
    session.transcript as any,
    (caseRow?.ideal_structure ?? {}) as any,
    (cheatSheet ?? {
      framework: null, hypothesis: null, key_numbers: [],
      decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
    }) as any,
    elapsedSec
  );

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  });

  let breakdown: any;
  try {
    breakdown = JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return NextResponse.json({ error: 'invalid evaluator output' }, { status: 502 });
  }

  await supabase
    .from('sessions')
    .update({
      score: breakdown.total ?? 0,
      score_breakdown: breakdown,
      ended_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', sessionId);

  return NextResponse.json(breakdown);
}
