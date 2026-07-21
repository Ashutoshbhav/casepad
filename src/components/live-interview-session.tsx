'use client';

// LiveInterviewSession — voice-first UI for the live interviewer, backed by
// the SAME /api/chat contract chat-panel.tsx uses (this repo's fortressed
// turn engine), just a different front end: state-driven instead of a
// scrolling bubble list, because a voice interface needs "whose turn is it"
// to be the primary thing on screen, not a chat transcript.
//
// Turn-taking (hands-free, bidirectional barge-in): <LiveMicInput> is now
// mounted continuously for the whole session, including while the
// interviewer is "speaking" — that's what makes barge-in possible. It calls
// `interrupt()` itself (via onBargeIn) the moment it detects the candidate
// talking over the AI; sending a turn while the AI is still "processing" the
// previous one is guarded inside LiveMicInput itself (phase-gated), not here.
// This replaced the original push-to-talk/hard-mutual-exclusion design — see
// git history on this file for that version if you need to compare.
//
// Never-fail: STT failure shows a plain text input for that turn instead of
// blocking (never_fail_stt); TTS failure just renders text with no audio,
// silently, since nothing the user depends on actually failed
// (never_fail_tts). A network stall on the chat call itself aborts and lets
// the candidate try again rather than hanging forever.
//
// Visual: cyberpunk-HUD treatment, scoped to this component only (forced
// dark canvas regardless of the app's light/dark toggle — the rest of the
// app stays on HUPR's monochrome system per globals.css; this is a
// deliberate, bounded exception for one full-screen "different mode"
// surface, not a brand change).

import { useEffect, useRef, useState } from 'react';
import { LiveMicInput, type ListenerStatus } from './live-mic-input';
import { LiveInterviewScene } from './live-interview-scene';
import { InlineSubmitCTA } from './inline-submit-cta';

export type GlowState = 'idle' | 'ai' | 'candidate' | 'processing';

type Msg = { role: 'user' | 'interviewer'; content: string };
type Phase = 'interviewer_speaking' | 'processing' | 'candidate_turn';

const STALL_MS = 30_000; // Same stall budget as chat-panel.tsx.

export function LiveInterviewSession({
  sessionId,
  initialMessages,
  endSessionAction,
}: {
  sessionId: string;
  initialMessages: Msg[];
  endSessionAction: () => Promise<void> | void;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  // Lazy initializer computes the correct starting phase synchronously at
  // mount — the effect below only needs to KICK OFF the async TTS fetch for
  // the opener, never to setState synchronously itself (that's what an
  // eslint react-hooks rule correctly flags: setState in the synchronous
  // body of an effect risks cascading renders).
  const [phase, setPhase] = useState<Phase>(() => {
    const last = initialMessages[initialMessages.length - 1];
    return last && last.role === 'interviewer' ? 'interviewer_speaking' : 'candidate_turn';
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [sttFallbackActive, setSttFallbackActive] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus>('loading');
  // Written at ~30Hz by LiveMicInput's onAmplitude — read directly inside
  // the 3D scene's useFrame loop, never through React state (see
  // live-interview-scene.tsx's header comment for why).
  const ampRef = useRef(0);
  // Real elapsed session time (not a fabricated stat) for the dial's
  // chronometer readout — ticks once/sec from actual mount time.
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedOpenerRef = useRef(false);
  // Cache of the browser's installed voices. getVoices() returns [] until the
  // async 'voiceschanged' event fires on most browsers, so we populate this
  // once in an effect below rather than reading it at speak-time.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Pick the most natural-sounding installed voice instead of the browser
  // default (the default is usually the most robotic option). The
  // "Natural"/"Neural" named voices (Microsoft's on Windows, Google's on
  // Chrome) are dramatically better and cost nothing. Prefers Indian English
  // first (fits this user), then US/GB, then any English, then whatever's
  // there. Returns null if no voices are loaded yet, in which case the
  // browser just uses its own default — still audible, never silent.
  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices || voices.length === 0) return null;
    const en = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    const pool = en.length ? en : voices;
    const score = (v: SpeechSynthesisVoice): number => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      let s = 0;
      if (name.includes('natural') || name.includes('neural')) s += 100;
      if (name.includes('google')) s += 40;
      if (lang.startsWith('en-in')) s += 8;
      else if (lang.startsWith('en-us')) s += 6;
      else if (lang.startsWith('en-gb')) s += 5;
      return s;
    };
    return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
  };

  // Voice-out ladder: Google TTS (server, best voice, needs a key) → browser
  // speechSynthesis (no key, no cost, works instantly, quality varies by
  // device) → silent text (last resort). So there is ALWAYS audio available
  // with zero setup, and the premium voice is a pure upgrade once the key is
  // set. Returns true if browser speech actually started, false if it's
  // unavailable (SSR, unsupported browser, or a synth error) so the caller
  // can fall through to text-only.
  const speakInBrowser = (text: string): boolean => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel(); // clear anything still queued
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickBestVoice();
      if (voice) utter.voice = voice;
      utter.rate = 1;
      utter.onend = () => setPhase('candidate_turn');
      utter.onerror = () => setPhase('candidate_turn');
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  };

  // Callers are responsible for setting phase to 'interviewer_speaking'
  // BEFORE invoking this (either via the mount effect's lazy initial state,
  // or synchronously in sendTurn's own non-effect code path) — this function
  // only sets phase again once the async work resolves.
  const playInterviewerTurn = async (text: string) => {
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        // Server TTS (Google) not configured or failed — drop to the browser
        // voice before going silent. Only text-only if even that is
        // unavailable.
        if (!speakInBrowser(text)) setPhase('candidate_turn');
        return;
      }
      const { audioBase64, mimeType } = (await res.json()) as { audioBase64: string; mimeType: string };
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setPhase('candidate_turn');
      audio.onerror = () => {
        if (!speakInBrowser(text)) setPhase('candidate_turn');
      };
      await audio.play().catch(() => {
        // Autoplay blocked or decode failure — try the browser voice instead.
        if (!speakInBrowser(text)) setPhase('candidate_turn');
      });
    } catch (err) {
      console.warn('[live-interview] server TTS unavailable, trying browser voice', err);
      if (!speakInBrowser(text)) setPhase('candidate_turn');
    }
  };

  // Play the opener (already seeded server-side) on first mount. Phase is
  // already correct via the lazy useState initializer above. The actual
  // kick-off is deferred via queueMicrotask rather than called directly in
  // the effect body — playInterviewerTurn eventually calls setPhase, and the
  // react-hooks linter flags any setState-containing function invoked
  // synchronously from an effect body regardless of await position; a
  // microtask hop breaks that direct call chain without changing behavior
  // (this still runs before the next paint).
  useEffect(() => {
    if (startedOpenerRef.current) return;
    startedOpenerRef.current = true;
    const last = initialMessages[initialMessages.length - 1];
    if (last && last.role === 'interviewer') {
      queueMicrotask(() => void playInterviewerTurn(last.content));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any audio (both the <audio> element and browser speech) if the user
  // navigates away mid-sentence — otherwise speechSynthesis keeps talking
  // after the page is gone.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Populate the installed-voices cache. getVoices() is often empty on the
  // first synchronous call; the 'voiceschanged' event fires once the browser
  // has loaded them. Sets a ref only (no state), so this can't trigger a
  // render cascade.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const interrupt = () => {
    audioRef.current?.pause();
    // Also cancel a browser-spoken turn — otherwise Stop wouldn't silence
    // audio coming from speechSynthesis rather than the <audio> element.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPhase('candidate_turn');
  };

  const sendTurn = async (text: string) => {
    setNotice(null);
    setSttFallbackActive(false);
    setPhase('processing');
    setMessages((m) => [...m, { role: 'user', content: text }]);

    const clientTurnId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const controller = new AbortController();
    const stallTimer = setTimeout(() => controller.abort(), STALL_MS);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userTurn: text, clientTurnId }),
        signal: controller.signal,
      });
      clearTimeout(stallTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        setNotice((data?.message as string) || 'Something went wrong — try again in a moment.');
        setPhase('candidate_turn');
        return;
      }

      const interviewerText = (await res.text()).trim();
      if (!interviewerText) {
        setNotice('No response — try again.');
        setPhase('candidate_turn');
        return;
      }
      setMessages((m) => [...m, { role: 'interviewer', content: interviewerText }]);
      setPhase('interviewer_speaking');
      void playInterviewerTurn(interviewerText);
    } catch (err) {
      clearTimeout(stallTimer);
      console.error('[live-interview] chat call failed', err);
      // Known residual: a genuine network failure here, followed by the
      // candidate simply speaking again, generates a new clientTurnId and
      // isn't deduped against a prior successful-but-unacknowledged save —
      // same narrow, documented residual as chat-panel.tsx's own retry path.
      setNotice('That took too long — try again.');
      setPhase('candidate_turn');
    }
  };

  const showSubmitCta = phase === 'candidate_turn' && messages.length >= 6;

  // listenerStatus === 'transcribing' MUST be checked before `phase`
  // fallback — the gap between "candidate stopped talking" and "phase
  // actually flips to processing" (which only happens once the Whisper call
  // resolves and sendTurn() runs) was previously falling through to
  // 'LISTENING', i.e. the UI looked frozen for the whole STT round-trip
  // right when it matters most for perceived responsiveness.
  const stateLabel =
    phase === 'interviewer_speaking'
      ? 'INTERVIEWER — SPEAKING'
      : phase === 'processing'
        ? 'PROCESSING'
        : listenerStatus === 'transcribing'
          ? 'PROCESSING'
          : listenerStatus === 'speaking'
            ? 'HEARING YOU'
            : sttFallbackActive
              ? 'TYPE YOUR ANSWER'
              : 'LISTENING';

  // Drives the 3D scene + HUD glow color — see live-interview-scene.tsx and
  // the .hud-glow-* rules in the trailing <style jsx> block. Distinct from
  // `phase` alone because "candidate is actively speaking"
  // (listenerStatus === 'speaking') should read differently from
  // "candidate_turn but silent, waiting," and transcribing should read as
  // "processing" for the same reason as stateLabel above.
  const glowState: GlowState =
    phase === 'interviewer_speaking'
      ? 'ai'
      : phase === 'processing' || listenerStatus === 'transcribing'
        ? 'processing'
        : listenerStatus === 'speaking'
          ? 'candidate'
          : 'idle';

  const elapsedLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  return (
    <main className={`hud-shell hud-glow-${glowState} min-h-screen flex flex-col`}>
      <div className="hud-scene" aria-hidden="true">
        <LiveInterviewScene glowState={glowState} ampRef={ampRef} />
      </div>
      <div className="hud-scanlines" aria-hidden="true" />
      <div className="hud-vignette" aria-hidden="true" />

      <section className="hud-header px-6 sm:px-12 py-6 flex items-center justify-between">
        <span className="hud-eyebrow">{'// LIVE_INTERVIEW'}</span>
        <button type="button" onClick={() => setTranscriptOpen((v) => !v)} className="hud-eyebrow hud-link">
          {transcriptOpen ? '[ HIDE TRANSCRIPT ]' : '[ SHOW TRANSCRIPT ]'}
        </button>
      </section>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="jarvis-dial">
          <div className="jarvis-ring jarvis-ring-tickset" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="jarvis-tick-wrap" style={{ transform: `rotate(${(360 / 36) * i}deg)` }}>
                <span className="jarvis-tick" />
              </div>
            ))}
          </div>
          <div className="jarvis-ring jarvis-ring-dash" aria-hidden="true" />
          <div className="jarvis-ring jarvis-arc jarvis-arc-a" aria-hidden="true" />
          <div className="jarvis-ring jarvis-arc jarvis-arc-b" aria-hidden="true" />

          <span className="jarvis-radial-label jarvis-radial-tl">SESSION {elapsedLabel}</span>
          <span className="jarvis-radial-label jarvis-radial-tr">ASH · LIVE</span>
          <span className="jarvis-radial-label jarvis-radial-bl">TURN {Math.ceil(messages.length / 2)}</span>
          <span className="jarvis-radial-label jarvis-radial-br">{listenerStatus.toUpperCase()}</span>

          <div className="jarvis-core">
            <span className="hud-readout" aria-live="polite">
              [ {stateLabel} ]
            </span>

            {phase === 'interviewer_speaking' && listenerStatus !== 'needs_permission' && listenerStatus !== 'loading' && (
              <button type="button" onClick={interrupt} className="hud-link-button">
                ⏻ JUMP IN
              </button>
            )}

            {!sttFallbackActive && (
              <LiveMicInput
                sessionId={sessionId}
                phase={phase}
                onAutoSend={(text) => void sendTurn(text)}
                onBargeIn={interrupt}
                onSttFailed={() => setSttFallbackActive(true)}
                onStatusChange={setListenerStatus}
                onAmplitude={(level) => {
                  ampRef.current = level;
                }}
              />
            )}
          </div>
        </div>
        <span className="hud-mic-note">Mic input degrades gracefully — never blocks a turn.</span>

        {sttFallbackActive && phase === 'candidate_turn' && (
          <form
            className="flex gap-2 w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const t = fallbackText.trim();
              if (t) {
                setFallbackText('');
                void sendTurn(t);
              }
            }}
          >
            <input
              autoFocus
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Type your answer for this turn…"
              className="hud-input flex-1 px-3 py-2"
            />
            <button type="submit" className="hud-link-button">
              SEND
            </button>
          </form>
        )}

        {notice && (
          <p role="alert" className="hud-notice text-sm text-center max-w-md">
            {notice}
          </p>
        )}
      </div>

      {transcriptOpen && (
        <section className="hud-transcript px-6 sm:px-12 py-6 max-h-[40vh] overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className="hud-transcript-line">
                <span className="hud-eyebrow mr-2">{m.role === 'interviewer' ? 'ASH' : 'YOU'}</span>
                {m.content}
              </div>
            ))}
          </div>
        </section>
      )}

      {showSubmitCta && (
        <InlineSubmitCTA sessionId={sessionId} endSessionAction={endSessionAction} messageCount={messages.length} />
      )}

      <style jsx>{`
        .hud-shell {
          position: relative;
          background: #05070a;
          color: #d7ecff;
          overflow: hidden;
          isolation: isolate;
        }
        .hud-scene {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .hud-scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background-image: repeating-linear-gradient(
            0deg,
            rgba(120, 220, 255, 0.035) 0px,
            rgba(120, 220, 255, 0.035) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .hud-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background: radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(5, 7, 10, 0.55) 78%, #05070a 100%);
        }
        .hud-header,
        .hud-shell > .flex-1 {
          position: relative;
          z-index: 2;
        }
        .hud-header {
          border-bottom: 1px solid rgba(120, 220, 255, 0.18);
        }
        .hud-eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(215, 236, 255, 0.55);
        }
        .hud-link {
          background: none;
          border: 0;
          cursor: pointer;
        }
        .hud-link:hover {
          color: #7dd8ff;
        }
        /* ---- JARVIS dial ---------------------------------------------- */
        .jarvis-dial {
          position: relative;
          width: clamp(300px, 42vw, 420px);
          height: clamp(300px, 42vw, 420px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .jarvis-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          pointer-events: none;
        }
        .jarvis-ring-tickset {
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
          animation: jarvis-spin 42s linear infinite;
        }
        /* Full-size wrapper rotated per-tick — default transform-origin
           (50% 50%, i.e. the wrapper's own center) lands exactly on the
           dial's center since the wrapper fills it via inset:0, so each
           tick swings to its angle with no manual radius/offset math. */
        .jarvis-tick-wrap {
          position: absolute;
          inset: 0;
        }
        .jarvis-tick {
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 9px;
          margin-left: -1px;
          background: var(--jarvis-glow, #22d3ee);
          opacity: 0.55;
          display: block;
        }
        .jarvis-ring-dash {
          width: 86%;
          height: 86%;
          transform: translate(-50%, -50%);
          border: 1px dashed rgba(120, 220, 255, 0.35);
          animation: jarvis-spin-reverse 26s linear infinite;
        }
        .jarvis-arc {
          border: 2px solid transparent;
        }
        .jarvis-arc-a {
          width: 96%;
          height: 96%;
          transform: translate(-50%, -50%);
          border-top-color: var(--jarvis-glow, #22d3ee);
          border-right-color: var(--jarvis-glow, #22d3ee);
          opacity: 0.8;
          animation: jarvis-spin 6s linear infinite;
          filter: drop-shadow(0 0 6px var(--jarvis-glow, #22d3ee));
        }
        .jarvis-arc-b {
          width: 70%;
          height: 70%;
          transform: translate(-50%, -50%);
          border-bottom-color: rgba(120, 220, 255, 0.5);
          border-left-color: rgba(120, 220, 255, 0.5);
          animation: jarvis-spin-reverse 9s linear infinite;
        }
        .jarvis-core {
          position: relative;
          z-index: 1;
          width: 62%;
          height: 62%;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
          padding: 20px;
          background: radial-gradient(circle at 50% 40%, rgba(120, 220, 255, 0.1), rgba(5, 10, 16, 0.72) 72%);
          border: 1px solid rgba(120, 220, 255, 0.3);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 0 40px var(--jarvis-glow-dim, rgba(34, 211, 238, 0.18)) inset, 0 0 60px var(--jarvis-glow-dim, rgba(34, 211, 238, 0.12));
          transition: box-shadow 300ms ease, border-color 300ms ease;
        }
        .jarvis-radial-label {
          position: absolute;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(215, 236, 255, 0.45);
          white-space: nowrap;
        }
        .jarvis-radial-tl { top: 2%; left: 2%; }
        .jarvis-radial-tr { top: 2%; right: 2%; text-align: right; }
        .jarvis-radial-bl { bottom: 2%; left: 2%; }
        .jarvis-radial-br { bottom: 2%; right: 2%; text-align: right; }

        @keyframes jarvis-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes jarvis-spin-reverse {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jarvis-ring-tickset, .jarvis-ring-dash, .jarvis-arc-a, .jarvis-arc-b {
            animation: none;
          }
        }

        .hud-glow-ai .jarvis-dial { --jarvis-glow: #22d3ee; --jarvis-glow-dim: rgba(34, 211, 238, 0.28); }
        .hud-glow-candidate .jarvis-dial { --jarvis-glow: #f2b84b; --jarvis-glow-dim: rgba(242, 184, 75, 0.28); }
        .hud-glow-processing .jarvis-dial { --jarvis-glow: #8b7bf0; --jarvis-glow-dim: rgba(139, 123, 240, 0.28); }
        .hud-glow-idle .jarvis-dial { --jarvis-glow: #3fa9c9; --jarvis-glow-dim: rgba(63, 169, 201, 0.16); }
        .hud-glow-candidate .jarvis-core { border-color: rgba(242, 184, 75, 0.45); }
        .hud-glow-candidate .hud-readout { color: #ffd682; }
        .hud-glow-processing .jarvis-core { animation: jarvis-pulse 1.3s ease-in-out infinite; }

        @keyframes jarvis-pulse {
          0%, 100% { box-shadow: 0 0 30px var(--jarvis-glow-dim) inset, 0 0 40px var(--jarvis-glow-dim); }
          50% { box-shadow: 0 0 50px var(--jarvis-glow-dim) inset, 0 0 80px var(--jarvis-glow-dim); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hud-glow-processing .jarvis-core { animation: none; }
        }

        .hud-readout {
          font-family: var(--font-mono);
          font-size: 13px;
          letter-spacing: 0.12em;
          color: #9be7ff;
        }
        .hud-mic-note {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          color: rgba(215, 236, 255, 0.35);
          text-align: center;
        }
        .hud-link-button {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 10px 18px;
          background: transparent;
          border: 1px solid rgba(120, 220, 255, 0.4);
          color: #9be7ff;
          cursor: pointer;
        }
        .hud-link-button:hover {
          border-color: #9be7ff;
          background: rgba(120, 220, 255, 0.08);
        }
        .hud-input {
          font-family: var(--font-mono);
          font-size: 14px;
          background: rgba(120, 220, 255, 0.04);
          border: 1px solid rgba(120, 220, 255, 0.25);
          color: #d7ecff;
          outline: none;
        }
        .hud-input::placeholder {
          color: rgba(215, 236, 255, 0.35);
        }
        .hud-notice {
          color: #ff8a8a;
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .hud-transcript {
          border-top: 1px solid rgba(120, 220, 255, 0.18);
        }
        .hud-transcript-line {
          font-family: var(--font-accent);
          font-size: 14px;
          color: rgba(215, 236, 255, 0.85);
        }

        /* Glow state — tied to whichever side currently "has the mic." */
        .hud-glow-ai .hud-frame {
          box-shadow: 0 0 28px rgba(120, 220, 255, 0.22);
          border-color: rgba(120, 220, 255, 0.5);
        }
        .hud-glow-ai .hud-corner {
          border-color: #9be7ff;
        }
        .hud-glow-candidate .hud-frame {
          box-shadow: 0 0 28px rgba(255, 214, 130, 0.2);
          border-color: rgba(255, 214, 130, 0.5);
        }
        .hud-glow-candidate .hud-corner {
          border-color: #ffd682;
        }
        .hud-glow-candidate .hud-readout {
          color: #ffd682;
        }
        .hud-glow-processing .hud-frame {
          animation: hud-pulse 1.4s ease-in-out infinite;
        }

        @keyframes hud-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(120, 220, 255, 0.12); }
          50% { box-shadow: 0 0 24px rgba(120, 220, 255, 0.28); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hud-glow-processing .hud-frame {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
