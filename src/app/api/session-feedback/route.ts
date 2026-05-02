import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const sessionId = body?.sessionId;
  const sentiment = body?.sentiment;
  const freeText = body?.freeText;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId (string, ≤100 chars) required' }, { status: 400 });
  }
  if (!sentiment || typeof sentiment !== 'string' || sentiment.length > 50) {
    return NextResponse.json({ error: 'sentiment (string, ≤50 chars) required' }, { status: 400 });
  }
  if (freeText !== undefined && freeText !== null && typeof freeText !== 'string') {
    return NextResponse.json({ error: 'freeText must be a string' }, { status: 400 });
  }
  if (typeof freeText === 'string' && freeText.length > 5000) {
    return NextResponse.json({ error: 'freeText too large (>5000 chars)' }, { status: 413 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('session_feedback')
    .insert({ session_id: sessionId, user_id: user.id, sentiment, free_text: typeof freeText === 'string' ? freeText.slice(0, 1000) : null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
