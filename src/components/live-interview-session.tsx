'use client';

// LiveInterviewSession — voice-first UI for the live interviewer, backed by
// the SAME /api/chat contract chat-panel.tsx uses (this repo's fortressed
// turn engine), just a different front end: state-driven instead of a
// scrolling bubble list, because a voice interface needs "whose turn is it"
// to be the primary thing on screen, not a chat transcript.
//
// Turn-taking (see the live-interviewer plan): the interviewer's turn and
// the candidate's turn are structurally mutually exclusive — <LiveMicInput>
// is disabled for the entire duration of 'interviewer_speaking' /
// 'processing', so it is impossible (not just unlikely) for the mic to be
// live while the interviewer is talking.
//
// Never-fail: STT failure shows a plain text input for that turn instead of
// blocking (never_fail_stt); TTS failure just renders text with no audio,
// silently, since nothing the user depends on actually failed
// (never_fail_tts). A network stall on the chat call itself aborts and lets
// the candidate try again rather than hanging forever.

import { useEffect, useRef, useState } from 'react';
import { LiveMicInput } from './live-mic-input';
import { InlineSubmitCTA } from './inline-submit-cta';

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

  const stateLabel =
    phase === 'interviewer_speaking'
      ? 'Interviewer is speaking'
      : phase === 'processing'
        ? 'Processing…'
        : sttFallbackActive
          ? 'Type your answer'
          : 'Your turn';

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-canvas)' }}>
      <section className="px-6 sm:px-12 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="hupr-mono-eyebrow">Live Interview</span>
        <button
          type="button"
          onClick={() => setTranscriptOpen((v) => !v)}
          className="hupr-mono-eyebrow underline"
          style={{ background: 'none', border: 0, cursor: 'pointer' }}
        >
          {transcriptOpen ? 'Hide transcript' : 'Show transcript'}
        </button>
      </section>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
        <span
          className="font-mono text-[12px] uppercase tracking-widest"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-live="polite"
        >
          {stateLabel}
        </span>

        {phase === 'interviewer_speaking' && (
          <button
            type="button"
            onClick={interrupt}
            className="px-4 py-2 rounded-md"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Stop — I want to jump in
          </button>
        )}

        {phase === 'candidate_turn' && !sttFallbackActive && (
          <LiveMicInput
            sessionId={sessionId}
            disabled={false}
            onAutoSend={(text) => void sendTurn(text)}
            onSttFailed={() => setSttFallbackActive(true)}
          />
        )}

        {phase !== 'candidate_turn' && (
          <div style={{ opacity: 0.35 }}>
            <LiveMicInput
              sessionId={sessionId}
              disabled={true}
              onAutoSend={() => {}}
              onSttFailed={() => {}}
            />
          </div>
        )}

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
              className="flex-1 px-3 py-2 rounded-md"
              style={{
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md"
              style={{
                background: 'var(--color-text-primary)',
                color: 'var(--color-bg-canvas)',
                border: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        )}

        {notice && (
          <p role="alert" className="text-sm text-center max-w-md" style={{ color: 'var(--color-signal-danger, #D94B4B)' }}>
            {notice}
          </p>
        )}
      </div>

      {transcriptOpen && (
        <section className="px-6 sm:px-12 py-6 max-h-[40vh] overflow-y-auto" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="max-w-2xl mx-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-accent)', fontSize: 14, color: 'var(--color-text-primary)' }}>
                <span className="font-mono text-[10px] uppercase tracking-wide mr-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {m.role === 'interviewer' ? 'Interviewer' : 'You'}
                </span>
                {m.content}
              </div>
            ))}
          </div>
        </section>
      )}

      {showSubmitCta && (
        <InlineSubmitCTA sessionId={sessionId} endSessionAction={endSessionAction} messageCount={messages.length} />
      )}
    </main>
  );
}
