import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { sessionId, sentiment, freeText } = await req.json();
  if (!sessionId || !sentiment) return NextResponse.json({ error: 'sessionId + sentiment required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('session_feedback')
    .insert({ session_id: sessionId, user_id: user.id, sentiment, free_text: freeText?.slice(0, 1000) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
