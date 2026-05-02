// src/app/api/cheatsheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { completeChat } from '@/lib/llm-router';
import { buildCheatSheetExtractionMessages } from '@/lib/groq/cheatsheet';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CheatSheetState } from '@/lib/types/domain';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const sessionId = body?.sessionId;
  const userQuestion = body?.userQuestion;
  const interviewerAnswer = body?.interviewerAnswer;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId (string, ≤100 chars) required' }, { status: 400 });
  }
  if (typeof userQuestion !== 'string') {
    return NextResponse.json({ error: 'userQuestion (string) required' }, { status: 400 });
  }
  if (typeof interviewerAnswer !== 'string') {
    return NextResponse.json({ error: 'interviewerAnswer (string) required' }, { status: 400 });
  }
  if (userQuestion.length > 10000 || interviewerAnswer.length > 10000) {
    return NextResponse.json({ error: 'userQuestion or interviewerAnswer too large (>10000 chars)' }, { status: 413 });
  }

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
  let raw: string;
  try {
    raw = await completeChat({
      messages: messages as any,
      json: true,
      temperature: 0.1,
      max_tokens: 600,
    });
  } catch {
    return NextResponse.json({ error: 'all providers failed' }, { status: 502 });
  }

  let parsed: Partial<CheatSheetState> = {};
  try {
    parsed = JSON.parse(raw || '{}');
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
