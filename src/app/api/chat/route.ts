// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId, userTurn } = await req.json() as { sessionId: string; userTurn: string };
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

  const stream = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: messages as any,
    stream: true,
    max_tokens: 300,
    temperature: 0.4,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
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
