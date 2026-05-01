import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { evaluateSession } from '@/lib/groq/evaluate-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  const supabase = await createSupabaseServerClient();
  const result = await evaluateSession(supabase, sessionId);
  return NextResponse.json(result.body, { status: result.status });
}
