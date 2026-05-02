// src/app/api/chat/route.ts
// Multi-provider chat with streaming. Tries Groq first (fast); falls through
// to NVIDIA NIM on 429 / 5xx so 10+ concurrent users don't all hit Groq's
// 6K TPM cap.

import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/llm-router';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const sessionId = body?.sessionId;
  const userTurn = body?.userTurn;
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response(JSON.stringify({ error: 'sessionId (string) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!userTurn || typeof userTurn !== 'string' || userTurn.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'userTurn (non-empty string) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const supabase = await createSupabaseServerClient();

  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, transcript, case_id, user_id')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return new Response('session not found', { status: 404 });

  const { data: caseRow, error: cErr } = await supabase
    .from('cases')
    .select('title, problem_statement, interviewer_notes')
    .eq('id', session.case_id)
    .single();
  if (cErr || !caseRow) return new Response('case not found', { status: 404 });

  const transcriptIn = (session.transcript as { role: string; content: string; timestamp: string }[]) ?? [];
  const withUser = [
    ...transcriptIn,
    { role: 'user', content: userTurn, timestamp: new Date().toISOString() },
  ];
  const disclosed = withUser
    .filter((t) => t.role === 'interviewer')
    .map((t) => t.content);

  const messages = buildInterviewerMessages(caseRow as any, disclosed, withUser as any);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      try {
        for await (const delta of streamChat({
          messages: messages as any,
          max_tokens: 300,
          temperature: 0.4,
        })) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const msg = `\n\n[Service is busy — please retry in a few seconds. ${(err as Error).message.slice(0, 80)}]`;
        controller.enqueue(encoder.encode(msg));
      }
      const finalTranscript = [
        ...withUser,
        { role: 'interviewer', content: full, timestamp: new Date().toISOString() },
      ];
      await supabase.from('sessions').update({ transcript: finalTranscript }).eq('id', sessionId);
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
