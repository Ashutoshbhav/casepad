// src/app/api/cheatsheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_SMALL } from '@/lib/groq/client';
import { buildCheatSheetExtractionMessages } from '@/lib/groq/cheatsheet';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CheatSheetState } from '@/lib/types/domain';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId, userQuestion, interviewerAnswer } = (await req.json()) as {
    sessionId: string;
    userQuestion: string;
    interviewerAnswer: string;
  };
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from('cheat_sheets')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  const current: CheatSheetState = existing
    ? {
        framework: existing.framework,
        hypothesis: existing.hypothesis,
        key_numbers: existing.key_numbers,
        decisions: existing.decisions,
        next_steps: existing.next_steps,
        manual_notes: existing.manual_notes,
        locked_fields: existing.locked_fields,
      }
    : {
        framework: null,
        hypothesis: null,
        key_numbers: [],
        decisions: [],
        next_steps: [],
        manual_notes: null,
        locked_fields: [],
      };

  const messages = buildCheatSheetExtractionMessages(userQuestion, interviewerAnswer, current);
  const completion = await groq.chat.completions.create({
    model: MODEL_SMALL,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 600,
  });

  let parsed: Partial<CheatSheetState> = {};
  try {
    parsed = JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return NextResponse.json({ error: 'invalid json from model' }, { status: 502 });
  }

  const merged: CheatSheetState = {
    framework: current.locked_fields.includes('framework')
      ? current.framework
      : (parsed.framework ?? current.framework),
    hypothesis: current.locked_fields.includes('hypothesis')
      ? current.hypothesis
      : (parsed.hypothesis ?? current.hypothesis),
    key_numbers: parsed.key_numbers ?? current.key_numbers,
    decisions: parsed.decisions ?? current.decisions,
    next_steps: parsed.next_steps ?? current.next_steps,
    manual_notes: current.manual_notes,
    locked_fields: current.locked_fields,
  };

  if (existing) {
    await supabase
      .from('cheat_sheets')
      .update({ ...merged, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('cheat_sheets')
      .insert({ session_id: sessionId, ...merged });
  }

  return NextResponse.json(merged);
}
