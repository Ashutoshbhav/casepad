'use client';

// LiveInterviewAvatar — OPTIONAL real-time lip-synced talking-head for Ash,
// via Simli (docs.simli.com). Explicitly good-to-have, not must-have —
// costs real money per minute connected, so this is entirely opt-in (see
// the mode selector in live-interview-session.tsx, JARVIS is the default/
// priority) and every failure mode falls back silently to the existing
// JARVIS HUD + normal TTS ladder, never a hard error.
//
// Session lifecycle: one Simli session per "avatar mode" activation, held
// open for as long as that mode stays selected (not reconnected per turn —
// simpler, no added per-turn connection latency; the trade-off is billed
// minutes track wall-clock connected time, not actual speaking time — see
// the plan doc for why this is the deliberate v1 choice).
//
// Audio: NOT the existing MP3 played via <audio> — this fetches a second,
// PCM16@16kHz variant of the same turn text from /api/voice/speak (see that
// route's `format: 'pcm16'` option) and feeds it to Simli's
// sendAudioData(). Simli's own WebRTC-returned audio track (attached to the
// <audio> ref below) becomes the actual played-back audio, in sync with the
// video — running the normal MP3 path at the same time would double up/
// desync, so the parent must skip its own audio ladder whenever speak()
// returns true (handled by the avatar) and only fall through to the normal
// ladder when it returns false (not connected / failed).
//
// package.json pins simli-client to EXACTLY 3.0.1 (no ^) — 3.0.2 ships
// dist/index.js requiring "./Client" but the actual compiled file on disk
// is "client.js" (lowercase), which Turbopack resolves case-sensitively and
// 500s the whole route on. Confirmed 3.0.1 doesn't have this bug. Re-check
// before ever bumping this dependency.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SimliClient as SimliClientType } from 'simli-client';

export type AvatarStatus = 'idle' | 'connecting' | 'connected' | 'unavailable' | 'error';

export type LiveInterviewAvatarHandle = {
  /** Sends a turn's text to the avatar to speak. Returns true if the avatar
   *  handled it (caller must skip the normal audio ladder for this turn),
   *  false if unavailable/failed (caller should fall through as usual). */
  speak: (text: string) => Promise<boolean>;
};

export const LiveInterviewAvatar = forwardRef<
  LiveInterviewAvatarHandle,
  { active: boolean; onStatusChange?: (status: AvatarStatus) => void; onSpeakEnd?: () => void }
>(function LiveInterviewAvatar({ active, onStatusChange, onSpeakEnd }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<SimliClientType | null>(null);
  const [status, setStatus] = useState<AvatarStatus>('idle');
  // Guards onSpeakEnd against firing on Simli's initial idle "silent" state
  // (handleSilence: true means it's silent by default before any real
  // speech) — only a 'silent' event AFTER a speak() call counts as "done."
  const hasSpokenRef = useRef(false);

  const setStatusReported = (s: AvatarStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  useEffect(() => {
    if (!active) {
      clientRef.current?.stop().catch(() => {});
      clientRef.current = null;
      hasSpokenRef.current = false;
      setStatusReported('idle');
      return;
    }
    if (!videoRef.current || !audioRef.current) return;

    let cancelled = false;
    setStatusReported('connecting');

    (async () => {
      try {
        const sessionRes = await fetch('/api/voice/avatar-session', { method: 'POST' });
        if (!sessionRes.ok) throw new Error(`avatar session unavailable (${sessionRes.status})`);
        const { sessionToken } = (await sessionRes.json()) as { sessionToken: string };
        if (cancelled || !videoRef.current || !audioRef.current) return;

        const { SimliClient } = await import('simli-client');
        const client = new SimliClient(sessionToken, videoRef.current, audioRef.current, null);
        client.on('error', (message) => {
          console.warn('[LiveInterviewAvatar] Simli error, falling back to JARVIS', message);
          if (!cancelled) setStatusReported('error');
        });
        client.on('stop', () => {
          if (!cancelled) setStatusReported('error');
        });
        client.on('silent', () => {
          if (hasSpokenRef.current) {
            hasSpokenRef.current = false;
            onSpeakEnd?.();
          }
        });

        await client.start();
        if (cancelled) {
          client.stop().catch(() => {});
          return;
        }
        clientRef.current = client;
        setStatusReported('connected');
      } catch (err) {
        console.warn('[LiveInterviewAvatar] connection failed, falling back to JARVIS', err);
        if (!cancelled) setStatusReported('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      clientRef.current?.stop().catch(() => {});
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useImperativeHandle(
    ref,
    () => ({
      speak: async (text: string): Promise<boolean> => {
        const client = clientRef.current;
        if (!client || status !== 'connected') return false;
        try {
          const res = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, format: 'pcm16' }),
          });
          if (!res.ok) return false;
          const { audioBase64 } = (await res.json()) as { audioBase64: string };
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          hasSpokenRef.current = true;
          client.sendAudioData(bytes);
          return true;
        } catch (err) {
          console.warn('[LiveInterviewAvatar] speak failed, caller should fall back', err);
          return false;
        }
      },
    }),
    [status]
  );

  return (
    <div className="live-avatar-shell" style={{ display: active ? 'block' : 'none' }}>
      <video ref={videoRef} autoPlay playsInline muted={false} className="live-avatar-video" />
      <audio ref={audioRef} autoPlay />
      {status === 'connecting' && <span className="live-avatar-status">CONNECTING…</span>}
      {(status === 'unavailable' || status === 'error') && (
        <span className="live-avatar-status live-avatar-status-error">AVATAR UNAVAILABLE — USING JARVIS</span>
      )}
      <style jsx>{`
        .live-avatar-shell {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
        }
        .live-avatar-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .live-avatar-status {
          /* Top, not bottom — the bottom of jarvis-core is where the mic
             enable button / controls live (see live-interview-session.tsx),
             and an unavailable/connecting avatar is exactly the state
             where those controls matter most and shouldn't be crowded. */
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.08em;
          color: rgba(230, 245, 255, 0.7);
          background: rgba(8, 14, 20, 0.6);
          padding: 3px 8px;
          white-space: nowrap;
        }
        .live-avatar-status-error {
          color: #ff8a8a;
        }
      `}</style>
    </div>
  );
});
