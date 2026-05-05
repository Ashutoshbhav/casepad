// src/app/api/voice/transcribe/route.ts
//
// Voice → text endpoint for the /solve chat panel. Accepts a multipart upload
// from <MicButton />, forwards the audio Blob to Groq's whisper-large-v3-turbo
// (free tier, 25 MB max, ~216x real-time), and returns { text, durationMs }.
//
// We do NOT auto-send the transcript — the client puts it in the input box
// for the user to edit (Indian-English WER ~15-20% means "DCF" can come back
// as "decaf" and the user must be allowed to fix it).
//
// Auth-gated via the existing Supabase server client. No new infra; reuses
// GROQ_API_KEY already set in .env.local for the chat path.

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs'; // Edge has flakier multipart-streaming on large blobs.

const MAX_BYTES = 25 * 1024 * 1024; // Groq STT hard cap.

// Domain-priming prompt — Whisper accepts a `prompt` hint that biases its
// vocabulary. We feed it the consulting-case lexicon so DCF, MECE, EBITDA,
// COGS, CAC, LTV, gross margin etc. transcribe correctly instead of being
// best-guessed as random English homophones.
const DOMAIN_PROMPT =
  'Business case interview answer about market sizing, profitability, M&A, market entry, operations. Common terms: DCF, MECE, hypothesis, EBITDA, COGS, CAC, LTV, gross margin.';

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // 1. Auth gate. We don't need the user object — just confirm a session
  //    exists. This prevents anonymous abuse of our Groq quota.
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData?.user) {
    return jsonError(401, 'unauthorized');
  }

  // 2. Parse multipart. NextRequest.formData() is the simplest path; for
  //    25 MB blobs it stays well within Node's memory budget on Vercel.
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error('[voice/transcribe] formData parse failed:', err);
    return jsonError(400, 'invalid multipart body');
  }

  const audio = form.get('audio');
  if (!audio || !(audio instanceof Blob)) {
    return jsonError(400, 'audio field required (Blob)');
  }
  if (audio.size === 0) {
    return jsonError(400, 'audio is empty');
  }
  if (audio.size > MAX_BYTES) {
    return jsonError(413, 'audio too large (max 25 MB)');
  }

  const sessionIdRaw = form.get('sessionId');
  const sessionId =
    typeof sessionIdRaw === 'string' && sessionIdRaw.length <= 100
      ? sessionIdRaw
      : null;

  // 3. Forward to Groq. We rebuild a fresh FormData rather than passing the
  //    incoming one — Groq is strict about field names + filename hints, and
  //    this lets us inject the domain prompt without leaking client fields.
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error('[voice/transcribe] GROQ_API_KEY missing');
    return jsonError(500, 'server misconfigured');
  }

  // Pick a filename extension that Groq's content sniffer is happy with.
  // It looks at the filename, not the actual MIME, so we map the blob's
  // declared MIME to the right suffix.
  const mime = audio.type || 'audio/webm';
  const ext =
    mime.includes('mp4') || mime.includes('m4a')
      ? 'mp4'
      : mime.includes('ogg')
        ? 'ogg'
        : mime.includes('wav')
          ? 'wav'
          : 'webm';

  const groqForm = new FormData();
  groqForm.append('file', audio, `recording.${ext}`);
  groqForm.append('model', 'whisper-large-v3-turbo');
  groqForm.append('language', 'en');
  groqForm.append('response_format', 'json');
  groqForm.append('temperature', '0');
  groqForm.append('prompt', DOMAIN_PROMPT);

  let groqRes: Response;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqForm,
    });
  } catch (err) {
    console.error('[voice/transcribe] groq fetch failed:', err);
    return jsonError(502, 'transcription failed (network)');
  }

  if (!groqRes.ok) {
    // Groq 429 → tell the client to back off without leaking internals.
    if (groqRes.status === 429) {
      const retryAfter = groqRes.headers.get('retry-after') ?? '30';
      console.warn('[voice/transcribe] groq 429', { sessionId, retryAfter });
      return jsonError(503, 'transcription service busy, please retry shortly', {
        retryAfter,
      });
    }
    const bodyText = await groqRes.text().catch(() => '');
    console.error('[voice/transcribe] groq error', {
      status: groqRes.status,
      body: bodyText.slice(0, 300),
      sessionId,
    });
    return jsonError(502, 'transcription failed');
  }

  let payload: { text?: string };
  try {
    payload = await groqRes.json();
  } catch (err) {
    console.error('[voice/transcribe] groq json parse failed:', err);
    return jsonError(502, 'transcription failed (bad response)');
  }

  const text = (payload.text ?? '').trim();
  const durationMs = Date.now() - startedAt;

  return new Response(JSON.stringify({ text, durationMs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
