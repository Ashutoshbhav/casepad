// src/app/api/voice/endpoint-check/route.ts
//
// Semantic endpointing: "does this transcribed answer fragment sound like a
// finished thought, or does it clearly trail off mid-clause?" Backs the
// continuation-buffer layer in live-mic-input.tsx — turn-detector.ts's VAD
// only ever measures SILENCE duration, which can't tell "I think we should
// look at the profitability lever." (done) apart from "I think we should..."
// (not done) when both are followed by the same length pause. Production
// voice-agent stacks (LiveKit, Deepgram) solve this with a second signal on
// top of VAD — a check on the TEXT, not the audio. This route is that check.
//
// LATENCY-CRITICAL, and deliberately NOT treated as a correctness-critical
// call: it goes through llm-router's `tier: 'aux'` (Cerebras first, same as
// issue-tree/cheatsheet/critic — see llm-router.ts's header) specifically so
// this doesn't eat into the SHARED Groq 100K-tokens/day budget the way a
// direct Groq call would (see the 2026-07-24 incident in
// docs/SESSION-STATE.md — a few extra Groq calls per turn is exactly what
// exhausted it last time). But llm-router's own timeouts (up to 12s connect)
// are tuned for eventually-correct, not for "must never add perceptible
// delay to turn-taking" — so this route races it against its own much
// tighter deadline and fails open the instant that fires. The router call
// may still land server-side after we've already answered; that's fine, the
// result is just discarded.
//
// Fails open to `{ complete: true }` on every error path (missing key, rate
// limit, timeout, malformed model output) — worst case this route behaves as
// if it doesn't exist, which is exactly what shipped before it did.

import { NextRequest, NextResponse } from 'next/server';
import { gateRequest } from '@/lib/api/gate';
import { completeChat } from '@/lib/llm-router';

export const runtime = 'nodejs';

const REQUEST_TIMEOUT_MS = 900;
const MAX_INPUT_CHARS = 1000; // an answer fragment, not a full turn

const SYSTEM_PROMPT =
  "You judge whether a fragment of a business case-interview candidate's spoken answer " +
  'sounds like a complete thought, or clearly trails off mid-sentence. Only answer ' +
  'INCOMPLETE if the text obviously cuts off mid-clause — a trailing conjunction ' +
  '("and", "so", "because", "the"), an unfinished number, or an unmistakably unfinished ' +
  'sentence. Short but complete answers ("yes", "42", "around 15 percent", "I\'d cut price") ' +
  'are COMPLETE. When in doubt, answer COMPLETE. Respond with exactly one word: ' +
  'COMPLETE or INCOMPLETE.';

function jsonComplete() {
  return NextResponse.json({ complete: true });
}

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return jsonComplete();
  }

  const text = (body.text ?? '').trim().slice(0, MAX_INPUT_CHARS);
  if (!text) return jsonComplete();

  // Auth + rate-limit like every other route — but a failure here fails
  // OPEN (complete), not closed, since the worst case is just "this turn
  // didn't get the enhancement," never "this turn got blocked."
  const gate = await gateRequest({ routeName: 'voice-endpoint-check', perUserPerMinute: 90 });
  if (!gate.ok) return jsonComplete();

  const timeout = new Promise<'TIMEOUT'>((resolve) => {
    setTimeout(() => resolve('TIMEOUT'), REQUEST_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      completeChat({
        tier: 'aux',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_tokens: 4,
        temperature: 0,
      }),
      timeout,
    ]);
    if (result === 'TIMEOUT') return jsonComplete();
    const raw = result.trim().toUpperCase();
    return NextResponse.json({ complete: !raw.startsWith('INCOMPLETE') });
  } catch (err) {
    console.warn('[voice/endpoint-check] failed, failing open to complete', err);
    return jsonComplete();
  }
}
