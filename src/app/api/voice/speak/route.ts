// src/app/api/voice/speak/route.ts
//
// Text → speech endpoint for the live interviewer's spoken replies. The text
// is already generated and persisted by /api/chat BEFORE this is ever
// called — TTS is a presentation layer on top of an already-successful turn,
// never a dependency of it. Any failure here (including "no provider
// configured yet") must degrade to text-only on the client; the live
// interview never blocks on this route.
//
// PROVIDER: Google Cloud Text-to-Speech, Neural2 voices. Chosen via a
// zero-tolerance research pass (adversarially verified, primary sources
// only) over Kokoro-82M, Piper, Edge TTS, Google Cloud TTS, Cartesia Sonic,
// and the Web Speech API — Google Cloud TTS was the only option confirmed to
// clear all three bars: genuinely free at real usage volume (1,000,000 free
// characters/month for Neural2 voices, confirmed on cloud.google.com/text-to-
// speech/pricing), natural-sounding, and a plain HTTPS call (no exotic Python/
// native-binary runtime, unlike Kokoro/Piper — runs fine in a Vercel Node
// function). Groq's own TTS models (Orpheus V1 English, PlayAI Dialog) are
// confirmed PAID with no free tier, so not used here.
//
// Note: Google Cloud requires a billing account (a card on file) to call the
// API at all, even though usage inside the free tier is $0 — unlike Groq's
// no-card-required free tier. Flagged explicitly; proceeding anyway since
// this was the only option that was actually free at real conversation
// volume and stable.

import { NextRequest } from 'next/server';
import { gateRequest } from '@/lib/api/gate';

export const runtime = 'nodejs';

const MAX_CHARS = 2000; // one interviewer turn is already capped at ~80 words in the prompt rules

// en-US-Neural2-C is a well-documented, broadly-available Neural2 voice — a
// safe default. If it's ever renamed/unavailable, Google's API 400s and this
// route's own degrade contract handles it (falls through to the catch below,
// client treats it as "no audio this turn"), so a wrong voice name fails
// safe rather than breaking anything. Swap via env var without a redeploy.
const DEFAULT_VOICE = process.env.GOOGLE_TTS_VOICE || 'en-US-Neural2-C';

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const gate = await gateRequest({ routeName: 'voice-speak', perUserPerMinute: 30 });
  if (!gate.ok) return gate.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid JSON body');
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return jsonError(400, 'text (non-empty string) required');
  if (text.length > MAX_CHARS) return jsonError(413, 'text too large');
  // 'pcm16' is for the optional Simli avatar (src/components/
  // live-interview-avatar.tsx), which needs raw PCM16 @ 16kHz to feed
  // sendAudioData() — everything else (existing browser playback) keeps
  // using the default 'mp3' path unchanged.
  const format: 'mp3' | 'pcm16' = body?.format === 'pcm16' ? 'pcm16' : 'mp3';

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    // Not configured yet — degrade cleanly rather than error loudly. The
    // client already treats any non-200 here as "no audio, text stands
    // alone", so this is a safe, intentional no-op until the key is set.
    console.warn('[voice/speak] GOOGLE_TTS_API_KEY not set — degrading to text-only');
    return jsonError(501, 'text-to-speech not configured');
  }

  let ttsRes: Response;
  try {
    ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: DEFAULT_VOICE.slice(0, 5), name: DEFAULT_VOICE },
          audioConfig:
            format === 'pcm16'
              ? { audioEncoding: 'LINEAR16', sampleRateHertz: 16000 }
              : { audioEncoding: 'MP3' },
        }),
      }
    );
  } catch (err) {
    console.error('[voice/speak] Google TTS fetch failed:', err);
    return jsonError(502, 'speech synthesis failed (network)');
  }

  if (!ttsRes.ok) {
    const bodyText = await ttsRes.text().catch(() => '');
    console.error('[voice/speak] Google TTS error', { status: ttsRes.status, body: bodyText.slice(0, 300) });
    return jsonError(502, 'speech synthesis failed');
  }

  let payload: { audioContent?: string };
  try {
    payload = await ttsRes.json();
  } catch (err) {
    console.error('[voice/speak] Google TTS JSON parse failed:', err);
    return jsonError(502, 'speech synthesis failed (bad response)');
  }

  if (!payload.audioContent) {
    return jsonError(502, 'speech synthesis returned no audio');
  }

  // Base64 passthrough — client decodes and either builds a playable data
  // URI/Blob (mp3) or feeds the raw bytes straight to Simli's
  // sendAudioData() (pcm16 — Google's LINEAR16 output is headerless raw
  // PCM, not a playable file by itself, hence the distinct mimeType so the
  // client never tries to play it directly).
  return new Response(
    JSON.stringify({
      audioBase64: payload.audioContent,
      mimeType: format === 'pcm16' ? 'audio/l16;rate=16000' : 'audio/mpeg',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
