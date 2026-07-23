// src/app/api/voice/transcribe/route.ts
//
// Voice → text endpoint, shared by <MicButton /> (/solve — text stays
// editable before send) and <LiveMicInput /> (/live-interview — auto-sent,
// so this is the ONLY chance to catch a bad transcription before it reaches
// the interviewer). Forwards the audio Blob to Groq's whisper-large-v3-turbo
// (free tier, 25 MB max, ~216x real-time).
//
// Auth-gated via the existing Supabase server client. No new infra; reuses
// GROQ_API_KEY already set in .env.local for the chat path.

import { NextRequest } from 'next/server';
import { gateRequest } from '@/lib/api/gate';

// verbose_json (vs. plain json) costs nothing extra — same endpoint, same
// latency — but returns per-segment avg_logprob/no_speech_prob, which is
// real confidence data straight from the model, not a heuristic bolted on
// after the fact. Used to flag "that came through unclear" to the live
// caption UI and to the interviewer itself (see /api/chat's lowConfidence
// handling) — genuinely correctly-transcribed-but-garbled speech isn't
// caught by this (that's a content/coherence problem, not an audio one; see
// the interviewer-prompt-level instruction in interviewer.ts/
// behavioral-interviewer.ts for that half).
//
// Thresholds are first-pass estimates from general Whisper confidence
// heuristics (avg_logprob closer to 0 = better; below roughly -0.5 usually
// reads as a garbled/uncertain segment; no_speech_prob above ~0.6 means the
// model itself doubts there was speech in that segment at all) — flagged as
// the first thing to retune once there's real usage data, same treatment as
// the VAD thresholds in turn-detector.ts.
const LOW_CONFIDENCE_AVG_LOGPROB = -0.5;
const LOW_CONFIDENCE_NO_SPEECH_PROB = 0.6;

type WhisperSegment = { avg_logprob?: number; no_speech_prob?: number };

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

  // 1. Parse multipart FIRST so we can read sessionId before rate-limiting.
  //    NextRequest.formData() is the simplest path; for 25 MB blobs it
  //    stays well within Node's memory budget on Vercel.
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

  // 2. Auth + dual-axis rate limit. Groq Whisper has a 7,200 audio-sec/hr
  //    free-tier cap shared across all users — heavy throttling per-user
  //    AND per-session prevents a single rogue tab from draining it.
  const gate = await gateRequest({
    routeName: 'voice-transcribe', perUserPerMinute: 30,
    sessionId: sessionId ?? undefined, perSessionPerMinute: 15,
  });
  if (!gate.ok) {
    // Convert NextResponse → plain Response shape used by this route.
    return gate.response;
  }

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
  groqForm.append('response_format', 'verbose_json');
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

  let payload: { text?: string; segments?: WhisperSegment[] };
  try {
    payload = await groqRes.json();
  } catch (err) {
    console.error('[voice/transcribe] groq json parse failed:', err);
    return jsonError(502, 'transcription failed (bad response)');
  }

  const text = (payload.text ?? '').trim();
  const durationMs = Date.now() - startedAt;

  // Defensive: confidence is an enhancement, not a requirement — missing or
  // malformed segments must never break transcription itself, so this is
  // fully optional and defaults to "confident" (no false alarms) if absent.
  let lowConfidence = false;
  try {
    const segments = payload.segments ?? [];
    if (segments.length > 0) {
      const avgLogprob = segments.reduce((sum, s) => sum + (s.avg_logprob ?? 0), 0) / segments.length;
      const avgNoSpeechProb = segments.reduce((sum, s) => sum + (s.no_speech_prob ?? 0), 0) / segments.length;
      lowConfidence = avgLogprob < LOW_CONFIDENCE_AVG_LOGPROB || avgNoSpeechProb > LOW_CONFIDENCE_NO_SPEECH_PROB;
    }
  } catch (err) {
    console.warn('[voice/transcribe] confidence computation skipped (non-blocking):', err);
  }

  return new Response(JSON.stringify({ text, durationMs, lowConfidence }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
