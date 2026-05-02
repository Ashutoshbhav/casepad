import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { evaluateSession } from '@/lib/groq/evaluate-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const sessionId = body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId (string, ≤100 chars) required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  let result;
  try {
    result = await evaluateSession(supabase, sessionId);
  } catch {
    return NextResponse.json({ error: 'evaluation failed' }, { status: 502 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
