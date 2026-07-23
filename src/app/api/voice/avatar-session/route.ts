// src/app/api/voice/avatar-session/route.ts
//
// Session-token issuance for the OPTIONAL Simli talking-head avatar (see
// src/components/live-interview-avatar.tsx). Mirrors /api/voice/speak's
// degrade contract exactly: this is a presentation-layer add-on, off by
// default, and a missing/failed key must never surface as a hard error —
// the client already treats any non-200 here as "avatar unavailable, stay
// on the JARVIS HUD."
//
// Simli's own docs are explicit that the real API key must stay server-side
// ("you don't want your api key to reside on the client") — this route's
// only job is to hand the client a short-lived session token instead, same
// pattern as every other provider key in this app (Groq, Google TTS).
//
// Cost note: unlike /api/voice/speak (billed per character, essentially
// free at this app's volume), Simli bills per MINUTE of session wall-clock
// once connected — maxSessionLength/maxIdleTime below are a deliberate
// backstop against an abandoned/idle tab racking up billed minutes.

import { NextRequest } from 'next/server';
import { generateSimliSessionToken, generateIceServers } from 'simli-client';
import { gateRequest } from '@/lib/api/gate';

export const runtime = 'nodejs';

const DEFAULT_FACE_ID = '0c2b8b04-5274-41f1-a21c-d5c98322efa9'; // Simli's documented stock demo face.
const MAX_SESSION_LENGTH_SEC = 45 * 60; // Covers a full case interview with margin.
const MAX_IDLE_TIME_SEC = 3 * 60; // Abandoned/idle tab stops billing quickly.

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(_req: NextRequest) {
  const gate = await gateRequest({ routeName: 'voice-avatar-session', perUserPerMinute: 10 });
  if (!gate.ok) return gate.response;

  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) {
    // Not configured — the avatar mode simply isn't offered. Same
    // intentional no-op as /api/voice/speak's missing-key path.
    return jsonError(501, 'avatar not configured');
  }

  const faceId = process.env.SIMLI_FACE_ID || DEFAULT_FACE_ID;

  try {
    // P2P transport requires real ICE servers — passing null here produces
    // a hard "Ice Servers Required for P2P Mode" client-side failure
    // (confirmed live). ICE server configs (STUN/TURN URLs + short-lived
    // TURN credentials) aren't sensitive the way the API key is — sending
    // them to the browser is normal WebRTC practice, the browser needs
    // them to negotiate the connection itself.
    const [{ session_token }, iceServers] = await Promise.all([
      generateSimliSessionToken({
        apiKey,
        config: {
          faceId,
          handleSilence: true,
          maxSessionLength: MAX_SESSION_LENGTH_SEC,
          maxIdleTime: MAX_IDLE_TIME_SEC,
        },
      }),
      generateIceServers(apiKey),
    ]);
    return new Response(JSON.stringify({ sessionToken: session_token, iceServers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[voice/avatar-session] Simli token/ICE generation failed:', err);
    return jsonError(502, 'avatar session unavailable');
  }
}
