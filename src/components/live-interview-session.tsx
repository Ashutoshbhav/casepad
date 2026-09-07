'use client';

// LiveInterviewSession — voice-first UI for the live interviewer, backed by
// the SAME /api/chat contract chat-panel.tsx uses (this repo's fortressed
// turn engine). Voice-first stays: the mic + TTS pipeline is the primary
// interface. What changed 2026-09-08 is the SKIN — the animated 3D "blob"
// + anime BlobFace centrepiece is gone; this now wears the v2 "room"
// aesthetic that /solve and /debrief use (cream ground, IBM Plex Mono
// transcript-as-document, the AshMark orb for interviewer presence,
// warm accent #f54e00). One system across text and voice.
//
// Turn-taking (hands-free, bidirectional barge-in): <LiveMicInput> is
// mounted continuously for the whole session, including while the
// interviewer is "speaking" — that's what makes barge-in possible. It
// calls interrupt() itself (via onBargeIn) the moment it detects the
// candidate talking over the AI.
//
// Never-fail: STT failure shows a plain text input for that turn instead
// of blocking; TTS failure just renders text with no audio, silently; a
// network stall on the chat call aborts and lets the candidate retry
// rather than hanging forever.

import { useEffect, useRef, useState } from 'react';
import { LiveMicInput, type ListenerStatus } from './live-mic-input';
import { IssueTreePanel } from './issue-tree-panel';
import { InlineSubmitCTA } from './inline-submit-cta';
import { AshMark } from './ash-mark';
import { roomFontVars } from '@/components/room/fonts';
import { A11yOptions } from '@/components/room/a11y-options';
import { nextSentenceBoundary } from '@/lib/interview/sentence-stream';

type Msg = { role: 'user' | 'interviewer'; content: string };
type Phase = 'interviewer_speaking' | 'processing' | 'candidate_turn';

// Raised from 30s (chat-panel's budget) after live turns hit the abort while
// the server was still legitimately working — /api/chat's maxDuration is 60s
// and the guardrail/critic regen chain can push a slow turn past 30. A lost
// turn costs the candidate their whole answer; 45s leaves the server 15s of
// real headroom while still failing before Vercel's own timeout.
const STALL_MS = 45_000;

// Smallest chunk we'll fire a TTS call for — short fragments ("Hmm.", "Try
// again.") are merged forward so audio units stay natural and we don't spam
// the voice endpoint.
const MIN_CHUNK_CHARS = 24;

// v2 "room" palette — transcript-as-document.
const INK = 'rgb(50,50,52)';
const CREAM = '#F5F0E8';
const HAIR = 'rgba(0,0,0,0.16)';
const ACCENT = '#f54e00'; // decorative rules / left-borders only
const ACCENT_TEXT = '#c23f00'; // >= 4.5:1 as text on cream / white on it
const MUTE = 'rgba(50,50,52,0.62)';
const MONO = 'var(--font-room-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-room-display, ui-sans-serif, sans-serif)';

const eyebrow: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: MUTE,
};

// Collapsible case-prompt block — full before the first user turn, a one-line
// teaser after (preserves transcript real estate), always one tap from back.
function PromptBlock({ text, title, collapsed }: { text: string; title?: string | null; collapsed: boolean }) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !collapsed;
  return (
    <div
      className="px-5 sm:px-8 py-3"
      style={{ borderBottom: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.4)' }}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
        style={eyebrow}
      >
        <span>Case prompt{title ? ` — ${title}` : ''}</span>
        <span className="flex-1 truncate" style={{ color: MUTE }}>
          {open ? '— hide' : '— tap to expand'}
        </span>
      </button>
      {open && (
        <p className="mt-2" style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.62, color: 'rgba(50,50,52,0.8)', maxWidth: '80ch' }}>
          {text}
        </p>
      )}
    </div>
  );
}

export function LiveInterviewSession({
  sessionId,
  initialMessages,
  endSessionAction,
  caseTitle,
  problemStatement,
}: {
  sessionId: string;
  initialMessages: Msg[];
  endSessionAction: () => Promise<void> | void;
  /** Non-null only for case-based sessions — gates both the problem-statement
   *  panel and the issue tree. Behavioral/caseless sessions get neither. */
  caseTitle?: string | null;
  problemStatement?: string | null;
}) {
  const hasCase = Boolean(problemStatement);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  // Lazy initializer computes the correct starting phase synchronously at
  // mount — the effect below only needs to KICK OFF the async TTS fetch for
  // the opener, never to setState synchronously itself.
  const [phase, setPhase] = useState<Phase>(() => {
    const last = initialMessages[initialMessages.length - 1];
    return last && last.role === 'interviewer' ? 'interviewer_speaking' : 'candidate_turn';
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [sttFallbackActive, setSttFallbackActive] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus>('loading');
  // Bumped once per completed turn — same trigger contract IssueTreePanel
  // already expects from solve-layout.tsx.
  const [treeRefresh, setTreeRefresh] = useState(0);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(true);
  // Live caption — "what did it just hear me say," sourced directly from
  // LiveMicInput's onAutoSend callback (which already has the text).
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  // Real signal from /api/voice/transcribe's Whisper confidence data.
  const [lastTranscriptLowConfidence, setLastTranscriptLowConfidence] = useState(false);
  // Real elapsed session time (not a fabricated stat) — ticks once/sec from
  // actual mount time.
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedOpenerRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Cache of the browser's installed voices. getVoices() returns [] until the
  // async 'voiceschanged' event fires on most browsers.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Handle to the currently-running streaming speaker (one per interviewer
  // turn) so interrupt()/unmount can stop it mid-sentence.
  const speakerRef = useRef<{ cancel: () => void } | null>(null);

  // Auto-scroll the transcript to the latest turn.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Pick the most natural-sounding installed voice instead of the browser
  // default. Prefers Indian English, then US/GB, then any English.
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

  // Speak ONE chunk via the browser's speechSynthesis. Resolves when the
  // utterance ends (or errors / isn't available). No phase side-effects — the
  // speaker loop owns those. This is both the per-chunk fallback when the
  // server voice fails and the whole path when no server voice is configured.
  const speakChunkInBrowser = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return resolve();
      try {
        const utter = new SpeechSynthesisUtterance(text);
        const voice = pickBestVoice();
        if (voice) utter.voice = voice;
        utter.rate = 1;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });

  // Synthesize ONE chunk via the server voice. Returns a ready (not-yet-played)
  // <audio>, or null when the server voice is unconfigured (501) / failed /
  // aborted — the caller then falls back to browser speech for that chunk.
  // Never throws.
  const synthChunk = async (text: string, signal: AbortSignal): Promise<HTMLAudioElement | null> => {
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      });
      if (!res.ok) return null;
      const { audioBase64, mimeType } = (await res.json()) as { audioBase64: string; mimeType: string };
      return new Audio(`data:${mimeType};base64,${audioBase64}`);
    } catch {
      return null;
    }
  };

  // Start a STREAMING speaker for one interviewer turn. Feed it text as it
  // arrives (pushText), call finish() when the source is complete. It carves
  // the text into ~sentence chunks, synthesizes each (server voice → browser
  // speech fallback), and plays them in order while prefetching the next — so
  // audio starts one sentence into generation, not one whole turn in. On
  // drain it resolves the phase to 'candidate_turn'. cancel() stops everything
  // mid-sentence (barge-in / navigation).
  const startSpeaker = () => {
    const ac = new AbortController();
    let cancelled = false;
    let consumed = 0; // chars of the source already carved into chunks
    let mergeBuf = ''; // short trailing sentences waiting to reach MIN_CHUNK_CHARS
    let done = false;
    const queue: string[] = [];
    let notify: (() => void) | null = null;
    const wake = () => {
      const n = notify;
      notify = null;
      n?.();
    };

    const carve = (full: string, flushAll: boolean) => {
      while (true) {
        const b = nextSentenceBoundary(full, consumed);
        if (b < 0 || b <= consumed) break;
        const seg = full.slice(consumed, b).trim();
        consumed = b;
        if (seg) mergeBuf = mergeBuf ? `${mergeBuf} ${seg}` : seg;
        if (mergeBuf.length >= MIN_CHUNK_CHARS) {
          queue.push(mergeBuf);
          mergeBuf = '';
        }
      }
      if (flushAll) {
        const tail = full.slice(consumed).trim();
        consumed = full.length;
        if (tail) mergeBuf = mergeBuf ? `${mergeBuf} ${tail}` : tail;
        if (mergeBuf) {
          queue.push(mergeBuf);
          mergeBuf = '';
        }
      }
      wake();
    };

    const handle = {
      pushText: (full: string) => {
        if (!cancelled) carve(full, false);
      },
      finish: (full: string) => {
        if (cancelled) return;
        carve(full, true);
        done = true;
        wake();
      },
      cancel: () => {
        if (cancelled) return;
        cancelled = true;
        done = true;
        try {
          ac.abort();
        } catch {
          /* noop */
        }
        audioRef.current?.pause();
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        wake();
      },
    };
    speakerRef.current = handle;

    void (async () => {
      let prefetch: Promise<HTMLAudioElement | null> | null = null;
      let prefetchText = '';
      let startedSpeaking = false;
      while (!cancelled) {
        if (queue.length === 0) {
          if (done) break;
          await new Promise<void>((r) => {
            notify = r;
          });
          continue;
        }
        const text = queue.shift() as string;
        if (!startedSpeaking) {
          startedSpeaking = true;
          setPhase('interviewer_speaking');
        }
        let audio: HTMLAudioElement | null;
        if (prefetch && prefetchText === text) {
          audio = await prefetch.catch(() => null);
        } else {
          audio = await synthChunk(text, ac.signal).catch(() => null);
        }
        prefetch = null;
        prefetchText = '';
        if (cancelled) break;
        // Prefetch the NEXT chunk's audio while this one plays.
        if (queue.length > 0) {
          prefetchText = queue[0];
          prefetch = synthChunk(prefetchText, ac.signal);
        }
        if (audio) {
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            audio!.onended = () => resolve();
            audio!.onerror = () => resolve();
            audio!.play().catch(() => resolve());
          });
        } else {
          await speakChunkInBrowser(text);
        }
      }
      if (speakerRef.current === handle) speakerRef.current = null;
      if (!cancelled) setPhase('candidate_turn');
    })();

    return handle;
  };

  // Play the opener (already seeded server-side) on first mount. Deferred via
  // queueMicrotask so the react-hooks linter doesn't flag a setState-
  // containing call in the effect body.
  useEffect(() => {
    if (startedOpenerRef.current) return;
    startedOpenerRef.current = true;
    const last = initialMessages[initialMessages.length - 1];
    if (last && last.role === 'interviewer') {
      queueMicrotask(() => {
        const sp = startSpeaker();
        sp.finish(last.content);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any audio if the user navigates away mid-sentence.
  useEffect(() => {
    return () => {
      speakerRef.current?.cancel();
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Populate the installed-voices cache — getVoices() is often empty on the
  // first synchronous call.
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
    speakerRef.current?.cancel();
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPhase('candidate_turn');
  };

  const sendTurn = async (text: string, lowConfidence?: boolean) => {
    setNotice(null);
    setSttFallbackActive(false);
    setPhase('processing');
    setLastTranscript(text);
    setLastTranscriptLowConfidence(Boolean(lowConfidence));
    setMessages((m) => [...m, { role: 'user', content: text }]);

    const clientTurnId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const controller = new AbortController();
    let stallTimer = setTimeout(() => controller.abort(), STALL_MS);
    let speaker: ReturnType<typeof startSpeaker> | null = null;
    let acc = '';

    const dropEmptyPlaceholder = () =>
      setMessages((m) =>
        m.length && m[m.length - 1].role === 'interviewer' && !m[m.length - 1].content ? m.slice(0, -1) : m
      );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userTurn: text, clientTurnId, lowConfidence: Boolean(lowConfidence) }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        clearTimeout(stallTimer);
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        setNotice((data?.message as string) || 'Something went wrong — try again in a moment.');
        setPhase('candidate_turn');
        return;
      }

      // Stream the interviewer reply and speak it sentence-by-sentence as it
      // arrives — first audio lands one sentence into generation, not after
      // the whole turn. The transcript updates live from the same buffer.
      speaker = startSpeaker();
      setMessages((m) => [...m, { role: 'interviewer', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          clearTimeout(stallTimer);
          stallTimer = setTimeout(() => controller.abort(), STALL_MS);
          acc += decoder.decode(value, { stream: true });
          const snapshot = acc;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'interviewer', content: snapshot };
            return copy;
          });
          speaker.pushText(acc);
        }
      } finally {
        clearTimeout(stallTimer);
      }

      acc = acc.trim();
      if (!acc) {
        speaker.cancel();
        dropEmptyPlaceholder();
        setNotice('No response — try again.');
        setPhase('candidate_turn');
        return;
      }
      speaker.finish(acc);
      if (hasCase) setTreeRefresh((n) => n + 1);
    } catch (err) {
      clearTimeout(stallTimer);
      console.error('[live-interview] chat call failed', err);
      const got = acc.trim();
      if (speaker && got.length >= 12) {
        // Real text already streamed — read out what we got, no error banner.
        speaker.finish(got);
        if (hasCase) setTreeRefresh((n) => n + 1);
      } else {
        speaker?.cancel();
        dropEmptyPlaceholder();
        setNotice('That took too long — try again.');
        setPhase('candidate_turn');
      }
    }
  };

  const showSubmitCta = phase === 'candidate_turn' && messages.length >= 6;
  const noUserYet = !messages.some((m) => m.role === 'user');

  // listenerStatus === 'transcribing' MUST be checked before the `phase`
  // fallback — the gap between "candidate stopped talking" and "phase flips
  // to processing" was previously reading as frozen.
  const stateLabel =
    phase === 'interviewer_speaking'
      ? 'Ash is speaking'
      : phase === 'processing' || listenerStatus === 'transcribing'
        ? 'Thinking…'
        : listenerStatus === 'speaking'
          ? 'Listening — go on'
          : sttFallbackActive
            ? 'Type your answer'
            : 'Your turn';

  const orbState: 'idle' | 'thinking' =
    phase === 'interviewer_speaking' || phase === 'processing' || listenerStatus === 'transcribing'
      ? 'thinking'
      : 'idle';

  const elapsedLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;
  const turnNo = Math.ceil(messages.length / 2);

  return (
    <div data-room className={`${roomFontVars} flex flex-col min-h-screen`} style={{ background: CREAM, color: INK }}>
      {/* HEADER — transcript-as-document masthead. */}
      <header
        className="px-5 sm:px-8 py-3.5 flex items-start justify-between gap-3"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'rgba(245,240,232,0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div className="min-w-0">
          <div style={{ ...eyebrow, marginBottom: 4 }}>Live interview · voice</div>
          <h1
            className="truncate"
            style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(15px, 2.2vw, 20px)', letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0 }}
          >
            {caseTitle || 'Practice interview'}
          </h1>
          <div style={{ marginTop: 6, width: 44, height: 2, background: ACCENT }} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0" style={{ fontFamily: MONO, fontSize: 11, color: MUTE }}>
          <span aria-live="off">{elapsedLabel}</span>
          <span aria-hidden="true">·</span>
          <span>Turn {turnNo}</span>
        </div>
      </header>

      {problemStatement && (
        <PromptBlock text={problemStatement} title={caseTitle ? caseTitle.toUpperCase() : null} collapsed={!noUserYet} />
      )}

      <A11yOptions />

      {/* BODY — transcript + voice dock (left) | issue tree (right on desktop,
          collapsible strip on mobile). */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          {/* TRANSCRIPT — a document, not a bubble list. */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-7 sm:px-10 sm:py-9 space-y-6">
            {noUserYet && messages.length <= 1 && (
              <div style={{ ...eyebrow, color: ACCENT_TEXT }}>
                Voice interview — Ash speaks, then it&apos;s your turn. Just talk; the mic is always on.
              </div>
            )}
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} style={{ borderLeft: `2px solid ${ACCENT}`, paddingLeft: 16 }}>
                    <div style={{ ...eyebrow, marginBottom: 4 }}>You</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.62, color: INK, whiteSpace: 'pre-wrap' }}>
                      {m.content || <span style={{ color: MUTE }}>…</span>}
                    </div>
                  </div>
                );
              }
              const isFirst = i === 0 && noUserYet;
              return (
                <div key={i} className={isFirst ? 'flex flex-col items-start gap-4 py-4' : 'flex items-start gap-3'}>
                  <div className="flex-shrink-0" style={{ marginTop: isFirst ? 0 : 1 }}>
                    <AshMark size={isFirst ? 44 : 16} state={i === messages.length - 1 ? orbState : 'idle'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ ...eyebrow, marginBottom: 3 }}>Ash{isFirst ? ' · Engagement Manager, Bain & Company' : ''}</div>
                    <div style={{ fontFamily: MONO, fontSize: isFirst ? 15.5 : 14, lineHeight: 1.62, color: INK, whiteSpace: 'pre-wrap' }}>
                      {m.content || <span style={{ color: MUTE }}>…</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VOICE DOCK — the primary interface. */}
          <div className="px-5 sm:px-10 pt-3 pb-5" style={{ borderTop: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.35)' }}>
            <div className="flex items-center gap-3">
              <AshMark size={20} state={orbState} />
              <span aria-live="polite" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 13.5, color: INK }}>
                {stateLabel}
              </span>
              {phase === 'interviewer_speaking' &&
                listenerStatus !== 'needs_permission' &&
                listenerStatus !== 'loading' && (
                  <button
                    type="button"
                    onClick={interrupt}
                    className="ml-auto px-3 py-1.5"
                    style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', border: `1px solid ${HAIR}`, color: INK, background: '#FFFFFF', cursor: 'pointer' }}
                  >
                    Jump in
                  </button>
                )}
            </div>

            <div className="mt-3 flex flex-col items-start gap-2">
              {!sttFallbackActive && (
                <LiveMicInput
                  sessionId={sessionId}
                  phase={phase}
                  patienceDefault={hasCase ? 'normal' : 'thinking'}
                  onAutoSend={(text, lowConfidence) => void sendTurn(text, lowConfidence)}
                  onBargeIn={interrupt}
                  onSttFailed={() => setSttFallbackActive(true)}
                  onStatusChange={setListenerStatus}
                />
              )}
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(50,50,52,0.45)' }}>
                Mic degrades gracefully — it never blocks a turn.
              </span>

              {lastTranscript && (
                <div
                  aria-live="polite"
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'rgba(50,50,52,0.7)',
                    padding: '8px 12px',
                    background: '#FFFFFF',
                    border: `1px solid ${lastTranscriptLowConfidence ? 'rgba(194,63,0,0.4)' : HAIR}`,
                    maxWidth: '60ch',
                  }}
                >
                  <span style={{ ...eyebrow, color: ACCENT_TEXT }}>You said</span>{' '}
                  {lastTranscript}
                  {lastTranscriptLowConfidence && (
                    <span style={{ color: ACCENT_TEXT, fontStyle: 'italic' }}>
                      {' '}
                      — that came through unclear, worth confirming
                    </span>
                  )}
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
                    className="flex-1 px-3 py-2 focus:outline-none"
                    style={{ fontFamily: MONO, fontSize: 14, background: '#FFFFFF', border: `1px solid ${HAIR}`, color: INK }}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2"
                    style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', background: ACCENT_TEXT, color: '#FFFFFF', border: 'none' }}
                  >
                    Send
                  </button>
                </form>
              )}

              {notice && (
                <p role="alert" style={{ fontFamily: MONO, fontSize: 12.5, color: ACCENT_TEXT }}>
                  {notice}
                </p>
              )}
            </div>
          </div>
        </div>

        {hasCase && (
          <div
            className="flex flex-col flex-shrink-0 md:flex-1 md:min-w-0 md:min-h-0 live-tree-col"
            style={{ borderTop: `1px solid ${HAIR}` }}
          >
            <button
              type="button"
              className="md:hidden flex items-center justify-between w-full px-5 py-2.5"
              onClick={() => setMobileTreeOpen((o) => !o)}
              aria-expanded={mobileTreeOpen}
              style={{ ...eyebrow, background: 'rgba(255,255,255,0.35)' }}
            >
              <span>Issue tree</span>
              <span aria-hidden="true">{mobileTreeOpen ? '▾' : '▸'}</span>
            </button>
            <div className="live-tree-body" data-open={mobileTreeOpen}>
              <IssueTreePanel sessionId={sessionId} refreshTrigger={treeRefresh} />
            </div>
          </div>
        )}
      </div>

      {showSubmitCta && (
        <InlineSubmitCTA sessionId={sessionId} endSessionAction={endSessionAction} messageCount={messages.length} />
      )}

      <style jsx>{`
        .live-tree-col {
          border-left: none;
        }
        .live-tree-body {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.25s ease;
        }
        .live-tree-body[data-open='true'] {
          max-height: 46vh;
          overflow-y: auto;
        }
        @media (min-width: 768px) {
          .live-tree-col {
            border-left: 1px solid ${HAIR};
            border-top: none !important;
          }
          .live-tree-body,
          .live-tree-body[data-open] {
            max-height: none;
            overflow: hidden;
            flex: 1;
            min-height: 0;
          }
        }
      `}</style>
    </div>
  );
}
