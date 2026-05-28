import { NextRequest, NextResponse } from 'next/server';
import { evaluateSession } from '@/lib/groq/evaluate-session';
import { gateRequest } from '@/lib/api/gate';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const sessionId = body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId (string, ≤100 chars) required' }, { status: 400 });
  }

  // Auth + rate-limit. Pre-launch this route had no auth check — anonymous
  // requests would still hit RLS (which is fine) but burn DB round-trips
  // and could be a DoS amplifier. evaluateSession itself uses the supplied
  // user-scoped client, so RLS continues to prevent cross-user reads.
  const gate = await gateRequest({ routeName: 'evaluate', perUserPerMinute: 20 });
  if (!gate.ok) return gate.response;
  const { supabase } = gate;

  let result;
  try {
    result = await evaluateSession(supabase, sessionId);
  } catch {
    return NextResponse.json({ error: 'evaluation failed' }, { status: 502 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
