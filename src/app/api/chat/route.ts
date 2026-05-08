// src/app/api/chat/route.ts
// Multi-provider chat with streaming. Tries Groq first (fast); falls through
// to NVIDIA NIM on 429 / 5xx so 10+ concurrent users don't all hit Groq's
// 6K TPM cap.

import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/llm-router';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isCannedTemplate } from '@/lib/canned-templates';
import { checkResponse, describeFailure, getGuardrailMode, regenHintFor } from '@/lib/groq/guardrails';
import { critiqueResponse, regenHintForCritic, shouldCritique } from '@/lib/groq/critic';

// Single-turn directive prepended to the system prompt when we detect that
// the candidate's message is a VERBATIM paste of one of the chat-panel
// FIRST_TURN_SUGGESTIONS. The detection is exact-string equality only —
// students who add their own thought won't trigger this. Goal: behaviorally
// reinforce that "structure for structure's sake" doesn't satisfy a real EM.
const CANNED_TEMPLATE_DIRECTIVE = `

== COACHING-TEMPLATE DETECTED (this turn only) ==
The candidate just used a textbook coaching opener verbatim — they didn't author this thinking. Your response for THIS TURN ONLY must:
1. Briefly acknowledge the structural habit ("Good scoping habit" or similar — 1 short clause).
2. Push for THEIR original thinking — invite them to express it in their own words. Examples: "now in your own words, what's the first hypothesis you'd test?" / "good — but tell me what YOU actually think the answer is going to be."
3. Stay 2–3 sentences total. Don't lecture. Don't penalize them. Don't break character.
4. After this single nudge, return to normal interviewer behavior on subsequent turns.`;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const sessionId = body?.sessionId;
  const userTurn = body?.userTurn;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return new Response(JSON.stringify({ error: 'sessionId (string, ≤100 chars) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!userTurn || typeof userTurn !== 'string' || userTurn.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'userTurn (non-empty string) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (userTurn.length > 10000) {
    return new Response(JSON.stringify({ error: 'userTurn too large (>10000 chars)' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  // Strip control chars (keep \n, \r, \t) to defang weird unicode
  const safeUserTurn = userTurn.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (safeUserTurn.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'userTurn (non-empty after sanitization) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
    { role: 'user', content: safeUserTurn, timestamp: new Date().toISOString() },
  ];
  const disclosed = withUser
    .filter((t) => t.role === 'interviewer')
    .map((t) => t.content);

  const messages = buildInterviewerMessages(caseRow as any, disclosed, withUser as any);

  // Detect verbatim coaching-template pastes. Append a one-turn directive to
  // the system prompt so Ash gently pushes for original thinking. We mutate
  // the messages array (not the persistent transcript / system builder), so
  // this only affects the current Groq call. Wrapped in try/catch so a
  // detection bug can never break the chat call.
  try {
    if (isCannedTemplate(safeUserTurn) && messages.length > 0 && messages[0].role === 'system') {
      messages[0] = {
        ...messages[0],
        content: messages[0].content + CANNED_TEMPLATE_DIRECTIVE,
      };
    }
  } catch {
    // fall through — never block the chat call on detection
  }

  const encoder = new TextEncoder();
  const guardrailMode = getGuardrailMode();

  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      let errored = false;

      // GATE mode: buffer the full response, validate, regen once on fail,
      // then ship to client. Loses live token streaming for ~1-2s of latency
      // but defends the system prompt deterministically.
      if (guardrailMode === 'gate') {
        try {
          for await (const delta of streamChat({
            messages: messages as any,
            max_tokens: 300,
            temperature: 0.4,
          })) {
            full += delta;
          }

          // Gate 1: deterministic guardrail (banned phrases + length cap)
          const verdict = checkResponse(full);
          if (!verdict.ok) {
            console.warn(`[guardrail] turn failed: ${describeFailure(verdict.failure)}`);
            const hintedMessages = [
              ...messages,
              { role: 'system' as const, content: regenHintFor(verdict.failure) },
            ];
            try {
              let retry = '';
              for await (const delta of streamChat({
                messages: hintedMessages as any,
                max_tokens: 300,
                temperature: 0.4,
              })) {
                retry += delta;
              }
              const retryVerdict = checkResponse(retry);
              if (retryVerdict.ok) {
                full = retry;
              } else {
                console.warn(`[guardrail] regen also failed: ${describeFailure(retryVerdict.failure)}; shipping original`);
              }
            } catch (regenErr) {
              console.warn(`[guardrail] regen call errored: ${(regenErr as Error).message}; shipping original`);
            }
          }

          // Gate 2: semantic critic (LLM-as-judge) — every Nth turn only.
          // Skipped on early turns (turnIndex 0,1) so the opener handoff
          // isn't gated; runs from turn 2 onward at CRITIC_TURN_INTERVAL cadence.
          // Fail-open on critic errors; never block the user on judge outage.
          const turnIndex = transcriptIn.length;
          if (turnIndex >= 2 && shouldCritique(turnIndex)) {
            try {
              const cv = await critiqueResponse(full, safeUserTurn);
              if (!cv.ok && cv.failures.length > 0) {
                console.warn(`[critic] turn ${turnIndex} failed: ${cv.failures.join(',')}`);
                const hintedMessages = [
                  ...messages,
                  { role: 'system' as const, content: regenHintForCritic(cv) },
                ];
                try {
                  let retry = '';
                  for await (const delta of streamChat({
                    messages: hintedMessages as any,
                    max_tokens: 300,
                    temperature: 0.4,
                  })) {
                    retry += delta;
                  }
                  // Re-run guardrail on critic-driven regen so we don't ship
                  // a banned-phrase-laden retry.
                  if (retry && checkResponse(retry).ok) {
                    full = retry;
                  } else {
                    console.warn(`[critic] regen failed guardrail or empty; shipping original`);
                  }
                } catch (regenErr) {
                  console.warn(`[critic] regen call errored: ${(regenErr as Error).message}; shipping original`);
                }
              }
            } catch (criticErr) {
              // critiqueResponse already fails open internally, but defensive double-catch
              console.warn(`[critic] outer catch: ${(criticErr as Error).message}`);
            }
          }

          controller.enqueue(encoder.encode(full));
        } catch (err) {
          errored = true;
          full = `\n\n[Service is busy — please retry in a few seconds. ${(err as Error).message.slice(0, 80)}]`;
          controller.enqueue(encoder.encode(full));
        }
      } else {
        // MONITOR or OFF: stream optimistically. In MONITOR we still log
        // failures after the stream completes, so we get visibility without
        // sacrificing UX. OFF skips even the post-stream check.
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
          errored = true;
          const msg = `\n\n[Service is busy — please retry in a few seconds. ${(err as Error).message.slice(0, 80)}]`;
          controller.enqueue(encoder.encode(msg));
          full = full ? full + msg : msg;
        }
        if (guardrailMode === 'monitor' && !errored) {
          const verdict = checkResponse(full);
          if (!verdict.ok) {
            console.warn(`[guardrail:monitor] turn failed: ${describeFailure(verdict.failure)}`);
          }
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
