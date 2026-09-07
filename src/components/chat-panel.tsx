'use client';
import { useState, useRef, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { TypewriterMessage } from './typewriter-message';
import { AshMark } from './ash-mark';
import { DisperseParticles } from './disperse-particles';
import { MicButton } from './mic-button';
import { InlineSubmitCTA } from './inline-submit-cta';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';

// "Ash is thinking" indicator — three animated dots rendered when the
// interviewer turn is streaming but hasn't produced text yet. Until this
// existed, the brief 200-800ms window between user-send and first-token
// showed only a muted "…" character, which felt static and dead.
// Replacing it with an animated indicator makes the interview feel live
// (the #1 cohort complaint per Ash 2026-05-29 was "doesn't feel like a
// real interview").
function TypingIndicator() {
  return (
    <span
      aria-label="Ash is thinking"
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: '1em',
        verticalAlign: 'middle',
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: 'var(--color-text-muted)',
            animation: `chat-typing-bounce 1.2s ease-in-out ${i * 0.16}s infinite`,
            display: 'inline-block',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes chat-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-4px); opacity: 0.95; }
        }
      `}</style>
    </span>
  );
}
// Shared with /api/chat — DO NOT duplicate the strings here. The route handler
// detects verbatim copy-pastes of these templates and nudges the candidate
// for original thinking; both ends MUST read from the same source.
import { FIRST_TURN_SUGGESTIONS } from '@/lib/canned-templates';
import { turnPressure } from '@/lib/interview/clock';
import { roomFontVars } from '@/components/room/fonts';
import { useA11yFlag } from '@/components/room/a11y-options';

// v2 "room" transcript palette.
const R_INK = 'rgb(50,50,52)';
const R_MUTE = 'rgba(50,50,52,0.62)'; // >= 4.5:1 on the cream ground (WCAG AA)
const R_HAIR = 'rgba(0,0,0,0.16)';
const R_ACCENT = '#f54e00'; // decorative rules / left-borders only
const R_ACCENT_TEXT = '#c23f00'; // >= 4.5:1 as text on cream, and white on it
const R_MONO = 'var(--font-room-mono, ui-monospace, monospace)';
const R_DISPLAY = 'var(--font-room-display, ui-sans-serif, sans-serif)';
const rEyebrow: React.CSSProperties = {
  fontFamily: R_MONO,
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: R_MUTE,
};

// §7.1 Trust UX — interviewer turns may carry optional `citations` from the
// playbook RAG retriever. Field is OPTIONAL and additive: legacy transcripts
// (no field) and user turns continue to render exactly as before.
type Citation = { section: string; sourceUrl?: string; text: string };
type Msg = {
  role: 'user' | 'interviewer';
  content: string;
  citations?: Citation[];
};

// Text-realism: the "they're waiting" note under the composer. Escalates at
// 45s / 90s of the candidate sitting on their turn. Pressure only — it never
// sends or blocks. Owns its own 1s tick so ChatPanel doesn't re-render every
// second while it's the candidate's turn.
function TurnPressureNote({ turnStartedAt }: { turnStartedAt: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [turnStartedAt]);
  const level = turnPressure(turnStartedAt, Date.now());
  if (level === 'none') return null;
  return (
    <span
      role="status"
      style={{
        fontFamily: 'var(--font-room-mono, ui-monospace, monospace)',
        fontSize: 11,
        color: level === 'pushing' ? '#b7791f' : 'rgba(50,50,52,0.62)',
      }}
    >
      {level === 'pushing'
        ? "The interviewer is waiting — send what you have and keep moving."
        : 'The interviewer is waiting on you.'}
    </span>
  );
}

export function ChatPanel({
  sessionId,
  initial,
  onTurnComplete,
  onMessagesChange,
  onMessagesArrayChange,
  onStreamingChange,
  endSessionAction,
  ended,
  timeUp,
}: {
  sessionId: string;
  initial: Msg[];
  onTurnComplete?: () => void;
  onMessagesChange?: (count: number) => void;
  // New (additive) — lifts the full messages array up so /solve-layout can
  // run client-side derivations (XP ticker) without ChatPanel knowing about
  // them. Fires on length change, NOT on streaming-token mutations.
  onMessagesArrayChange?: (msgs: { role: 'user' | 'interviewer'; content: string }[]) => void;
  // Lifted up so the solve header's 3D AshMark can pause its rotation
  // while the interviewer is mid-reply — keeps the CPU free for streaming
  // and lets the mark sit still while the words flow.
  onStreamingChange?: (streaming: boolean) => void;
  // Passed through so the bottom-of-chat InlineSubmitCTA can fire the
  // existing endSession server action without going up to /solve.
  endSessionAction?: () => Promise<void> | void;
  ended?: boolean;
  // Text-realism (PRD v3.1): the 25-min clock hit 0:00. Soft-lock the
  // composer and push the submit CTA — never auto-submit for the user.
  timeUp?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  // Text-realism: no pasting a pre-written answer into a live interview.
  const [pasteBlocked, setPasteBlocked] = useState(false);
  // When it becomes the candidate's turn, start a soft "they're waiting"
  // timer — the text analogue of a spoken-ramble interrupt. Pressure only.
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastOrbRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // WCAG opt-in: when on, keep the whole transcript readable (no scroll-away
  // fade). Also implied by reduced-motion — the fade is a motion affordance.
  const assistiveTranscript = useA11yFlag('transcript');

  // Bulletproofing (2026-06-03): abort + stall-timeout so a stalled stream can
  // never hang the UI, plus a per-logical-turn id so an explicit retry / network
  // re-send is deduped server-side. Both additive + fail-open.
  const abortRef = useRef<AbortController | null>(null);
  const currentTurnIdRef = useRef<string | null>(null);
  // No progress (no token) for this long → treat the stream as stalled and
  // abort so the user can recover. Server caps the function at 60s anyway.
  const STALL_MS = 30_000;

  const newTurnId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch { /* fall through to a best-effort id */ }
    return `t-${Date.now()}-${Math.round(performance.now())}`;
  };

  const stopStreaming = () => {
    try { abortRef.current?.abort(); } catch { /* noop */ }
  };
  const [disperse, setDisperse] = useState<
    | { fromX: number; fromY: number; toX: number; toY: number; key: number }
    | null
  >(null);

  // Track which interviewer-message index has already been seen typewritten,
  // so we only animate the FIRST one (the case opener). Subsequent replies
  // render instantly. We persist via a ref to survive re-renders.
  const firstInterviewerSeenRef = useRef<boolean>(
    initial.some((m) => m.role === 'interviewer')
  );

  // Auto-scroll. During streaming the messages array updates ~50× / sec,
  // and `behavior: 'smooth'` queues a smooth scroll on every tick — they
  // pile up and fight, producing the streaming-jank we used to see.
  // Use 'auto' (instant) during streaming, 'smooth' only at boundaries.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: streaming ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, streaming]);

  // Turn-pressure clock: runs only while it's the candidate's turn (an
  // interviewer message is last, nothing streaming, session live). Reset the
  // moment they send or the interviewer speaks again.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!streaming && last?.role === 'interviewer' && !ended && !timeUp) {
      setTurnStartedAt((t) => t ?? Date.now());
    } else {
      setTurnStartedAt(null);
    }
  }, [messages, streaming, ended, timeUp]);

  // Notify parent of message count for progress-bar mapping.
  useEffect(() => { onMessagesChange?.(messages.length); }, [messages.length, onMessagesChange]);
  // Lifted messages array (length-gated so streaming tokens don't re-fire).
  // Pairs with onMessagesChange — the parent gets count + array on the same
  // tick, no double bookkeeping.
  useEffect(() => { onMessagesArrayChange?.(messages); }, [messages.length, onMessagesArrayChange]);

  // Notify parent when streaming starts/stops so ambient surfaces (e.g.
  // the /solve header AshMark3D) can pause animation during a reply.
  useEffect(() => { onStreamingChange?.(streaming); }, [streaming, onStreamingChange]);

  // Drive the persistent asterisk's aiState — 'thinking' while the
  // interviewer is mid-stream, back to 'idle' on stop. Reading the setter
  // imperatively (getState()) so this effect doesn't re-run on every
  // store change. The store's setAiState now honors AI_STATE_PRIORITY,
  // so a celebrating burst from score-reveal can't be downgraded by a
  // late streaming=false here.
  useEffect(() => {
    try {
      if (streaming) {
        useAsteriskSceneStore.getState().setAiState('thinking');
      } else {
        // Force back to idle when the stream ends so the priority gate
        // doesn't hold the asterisk on 'thinking' forever. Higher-priority
        // states (approving / celebrating) overwrite this immediately.
        useAsteriskSceneStore.getState().setAiState('idle', { force: true });
      }
    } catch (e) {
      console.warn('[chat-panel] setAiState(thinking) failed:', e);
    }
  }, [streaming]);

  // Anticipating — fires only on the empty→non-empty transition (and
  // resets on non-empty→empty). Previously this effect re-ran on every
  // keystroke, hammering the Zustand store. Latched via ref so the work
  // is bounded to ~2 setAiState calls per draft turn.
  const wasNonEmptyRef = useRef<boolean>(false);
  useEffect(() => {
    if (streaming) return; // 'thinking' wins
    try {
      const isNonEmpty = input.trim().length > 0;
      if (isNonEmpty === wasNonEmptyRef.current) return;
      wasNonEmptyRef.current = isNonEmpty;
      const setAiState = useAsteriskSceneStore.getState().setAiState;
      if (isNonEmpty) {
        setAiState('anticipating');
      } else {
        // Only step down if we're currently in 'anticipating' — don't yank
        // a higher-priority state to idle. Read state once.
        const cur = useAsteriskSceneStore.getState().aiState;
        if (cur === 'anticipating') setAiState('idle', { force: true });
      }
    } catch (e) {
      console.warn('[chat-panel] setAiState(anticipating) failed:', e);
    }
  }, [input, streaming]);

  // §7.1 Trust UX — quiet "see why" footnote rendered under interviewer
  // turns that carry playbook citations. Caps at 3 entries; missing sourceUrl
  // renders the section label as plain text (no link). Whisper-quiet styling
  // (~11px, muted, hairline top rule) so it never dominates the message.
  const CitationsRow = ({ citations }: { citations: Citation[] }) => {
    if (!citations || citations.length === 0) return null;
    const shown = citations.slice(0, 3);
    return (
      <div
        className="mt-1.5 pt-1.5 text-[11px] leading-[1.4] flex flex-wrap items-center gap-x-1.5 gap-y-1"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span
          className="font-mono uppercase tracking-[0.14em] text-[10px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Real EMs probe like this
        </span>
        {shown.map((c, idx) => {
          const sep = idx > 0 ? <span aria-hidden="true">·</span> : <span aria-hidden="true">·</span>;
          const label = c.section || 'source';
          return (
            <span key={`${label}-${idx}`} className="inline-flex items-center gap-1">
              {sep}
              {c.sourceUrl ? (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Source: ${label} (opens in new tab)`}
                  title={c.text}
                  className="underline decoration-dotted underline-offset-2 hover:opacity-90"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  §{label} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span title={c.text} style={{ color: 'var(--color-text-secondary)' }}>
                  §{label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const lastMsg = messages[messages.length - 1];
  const hasHangingUserTurn =
    !streaming && messages.length > 0 && lastMsg?.role === 'user';

  const retryLastUserTurn = () => {
    if (!lastMsg || lastMsg.role !== 'user' || streaming) return;
    // Reuse the same turn id so the server dedups this as the SAME logical
    // turn instead of appending a duplicate.
    sendUserTurn(lastMsg.content, true, currentTurnIdRef.current ?? undefined);
  };

  const sendUserTurn = async (text: string, alreadyAppended = false, reuseTurnId?: string) => {
    if (!text.trim() || streaming) return;
    const clientTurnId = reuseTurnId ?? newTurnId();
    currentTurnIdRef.current = clientTurnId;
    const controller = new AbortController();
    abortRef.current = controller;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const armStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => { try { controller.abort(); } catch { /* noop */ } }, STALL_MS);
    };
    // Fire-and-forget disperse animation IN PARALLEL with the actual send.
    // Skipped under reduced-motion. Doesn't block the network call.
    if (!reduced && !alreadyAppended && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const orbRect = lastOrbRef.current?.getBoundingClientRect();
      const fromX = inputRect.left + inputRect.width / 2;
      const fromY = inputRect.top + inputRect.height / 2;
      // Fallback target: top-center of the chat scroll area when no orb exists yet.
      const toX = orbRect ? orbRect.left + orbRect.width / 2 : fromX;
      const toY = orbRect ? orbRect.top + orbRect.height / 2 : inputRect.top - 200;
      setDisperse({ fromX, fromY, toX, toY, key: Date.now() });
      setTimeout(() => setDisperse(null), 700);
    }
    if (!alreadyAppended) setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setStreaming(true);

    let streamOk = false;
    let sawInterviewerPlaceholder = false;
    try {
      armStall();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userTurn: text, clientTurnId }),
        signal: controller.signal,
      });

      // Defensive: if the API errored before sending a body, bail without
      // tipping the whole page into error.tsx. Append a graceful message.
      if (!res.ok || !res.body) {
        setMessages((m) => [
          ...m,
          {
            role: 'interviewer',
            content: 'Sorry — that turn didn\'t reach the model. Try again?',
          },
        ]);
        return;
      }
      setMessages((m) => [...m, { role: 'interviewer', content: '' }]);
      sawInterviewerPlaceholder = true;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        armStall(); // progress — reset the stall watchdog on every chunk
        acc += decoder.decode(value);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'interviewer', content: acc };
          return copy;
        });
      }
      // Once the stream completes, mark that an interviewer message has been
      // seen — so even a fresh-session opener that arrives via streaming
      // doesn't re-typewriter on later renders.
      firstInterviewerSeenRef.current = true;
      streamOk = true;

      fetch('/api/cheatsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userQuestion: text, interviewerAnswer: acc }),
      }).catch(() => {});
    } catch (err) {
      // Network drop, stall-abort, or the user pressed Stop. Never crash the
      // page. Drop an EMPTY interviewer placeholder so the "Retry that turn"
      // banner (driven by a hanging user turn) appears and the user can
      // recover. If real text already streamed, keep it — they saw it.
      setMessages((m) => {
        if (!sawInterviewerPlaceholder) return m;
        const last = m[m.length - 1];
        if (last && last.role === 'interviewer' && (!last.content || last.content.trim().length === 0)) {
          return m.slice(0, -1);
        }
        return m;
      });
      const aborted = (err as Error)?.name === 'AbortError';
      console.warn(`[chat-panel] stream ${aborted ? 'aborted/stalled' : 'failed'}: ${(err as Error)?.message ?? String(err)}`);
    } finally {
      if (stallTimer) clearTimeout(stallTimer);
      abortRef.current = null;
      setStreaming(false);
      // Only fire the "good move" approving pulse when the stream landed
      // cleanly (not on error / abort). State auto-reverts at the
      // useFrame layer after 1.5s, but we step it down explicitly at 600ms
      // so the rest of the app feels responsive — that's the spec.
      if (streamOk && !reduced) {
        try {
          const setAiState = useAsteriskSceneStore.getState().setAiState;
          setAiState('approving');
          setTimeout(() => {
            try {
              const cur = useAsteriskSceneStore.getState().aiState;
              if (cur === 'approving') setAiState('idle', { force: true });
            } catch (e) {
              console.warn('[chat-panel] setAiState(idle) failed:', e);
            }
          }, 600);
        } catch (e) {
          console.warn('[chat-panel] setAiState(approving) failed:', e);
        }
      }
    }

    onTurnComplete?.();
  };

  const send = () => sendUserTurn(input);

  const isEmpty = messages.length === 0 && !streaming;

  // Find index of the first interviewer message — that one alone gets the
  // typewriter (only when it was already in the initial transcript and the
  // session is being resumed; live-streamed messages render via the
  // streaming path).
  const initialFirstInterviewerIdx = (() => {
    if (firstInterviewerSeenRef.current === false) return -1;
    if (initial.length === 0) return -1;
    const idx = initial.findIndex((m) => m.role === 'interviewer');
    return idx;
  })();
  // True only for the initial-load opener. We use the "is this message
  // present in `initial`?" check via index parity.
  const shouldTypewriter = (i: number, role: string) =>
    role === 'interviewer' && i === initialFirstInterviewerIdx && i < initial.length;

  return (
    <div data-room className={`${roomFontVars} flex flex-col h-full`} style={{ background: '#F5F0E8', color: R_INK }}>
      {disperse && (
        <DisperseParticles
          key={disperse.key}
          fromX={disperse.fromX}
          fromY={disperse.fromY}
          toX={disperse.toX}
          toY={disperse.toY}
        />
      )}
      <div
        className="flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10 space-y-6"
        style={
          messages.length > 4 && !assistiveTranscript && !reduced
            ? {
                // Scroll-away transcript (PRD v3.1): older turns fade out at
                // the top — you can't re-read the whole case in a real
                // interview. Non-destructive: content stays, still scrollable.
                // Off for the assistive-transcript opt-in and reduced-motion.
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
                maskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
              }
            : undefined
        }
      >
        {isEmpty && (
          <div style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px #e8e4dd', padding: 20 }}>
            <div style={{ ...rEyebrow, color: R_ACCENT_TEXT, marginBottom: 8 }}>First turn — pick a move</div>
            <p style={{ fontFamily: R_MONO, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(50,50,52,0.75)', margin: '0 0 14px' }}>
              Real case interviews start with you taking the lead. Tap one to drop a suggested opening in — then edit it to fit the case.
            </p>
            <div className="flex flex-col gap-1.5">
              {FIRST_TURN_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.text)}
                  className="text-left px-3 py-2"
                  style={{ fontFamily: R_MONO, fontSize: 12.5, background: '#F5F0E8', border: `1px solid ${R_HAIR}`, color: R_INK }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: R_MONO, fontSize: 10, fontStyle: 'italic', color: R_MUTE, marginTop: 12 }}>
              The prompt is short on purpose. Ask for data, build structure as you go. The tree fills from your chat.
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          if (isUser) {
            // Candidate turn — a document line, not a bubble. Accent left rule,
            // "YOU" eyebrow, Plex Mono body.
            return (
              <div key={i} style={{ borderLeft: `2px solid ${R_ACCENT}`, paddingLeft: 16 }}>
                <div style={{ ...rEyebrow, marginBottom: 4 }}>You</div>
                <div style={{ fontFamily: R_MONO, fontSize: 14, lineHeight: 1.62, color: R_INK, whiteSpace: 'pre-wrap' }}>
                  {m.content || <span style={{ color: R_MUTE }}>…</span>}
                </div>
              </div>
            );
          }
          // Interviewer — Liquid Tutor: breathing orb avatar + serif italic
          // transcript style. No bubble, no left rule. The orb is Ash's
          // presence; it streams alongside his words.
          const isStreamingNow = streaming && i === messages.length - 1;
          const orbState = isStreamingNow ? 'thinking' : 'idle';
          // Find the LAST interviewer-message index — that orb is the
          // disperse-on-send target.
          const lastInterviewerIdx = (() => {
            for (let j = messages.length - 1; j >= 0; j -= 1) {
              if (messages[j].role === 'interviewer') return j;
            }
            return -1;
          })();
          const isLastInterviewer = i === lastInterviewerIdx;
          // FIRST-TURN HERO MOMENT — when this is the very first message in
          // the transcript AND no user has typed yet, render the interviewer
          // turn as a hero introduction: bigger AshMark, identifier line
          // ("Ash · EM at Bain"), larger type, generous breathing room.
          // Cohort feedback "AI feels boring" is sharpest exactly here, at
          // first contact. After the candidate types their first response,
          // subsequent interviewer turns render in the compact transcript
          // style.
          const noUserYet = !messages.some((mm) => mm.role === 'user');
          const isFirstTurnHero = i === 0 && noUserYet;
          if (isFirstTurnHero) {
            return (
              <div
                key={i}
                className="flex flex-col items-start gap-5 py-6 sm:py-10"
              >
                <div
                  ref={isLastInterviewer ? lastOrbRef : undefined}
                  className="flex-shrink-0"
                >
                  <AshMark size={48} state={orbState} />
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    style={{
                      fontFamily: R_DISPLAY,
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: '-0.01em',
                      color: R_INK,
                      lineHeight: 1,
                    }}
                  >
                    Ash
                  </div>
                  <div style={{ ...rEyebrow, letterSpacing: '0.14em' }}>
                    Engagement Manager · Bain &amp; Company
                  </div>
                </div>
                <div
                  className="max-w-[62ch]"
                  style={{
                    fontFamily: R_MONO,
                    fontSize: 15.5,
                    lineHeight: 1.62,
                    color: R_INK,
                  }}
                >
                  {m.content ? (
                    shouldTypewriter(i, m.role) ? (
                      <TypewriterMessage text={m.content} />
                    ) : (
                      m.content
                    )
                  ) : isStreamingNow ? (
                    <TypingIndicator />
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                  )}
                  {m.citations && m.citations.length > 0 && (
                    <CitationsRow citations={m.citations} />
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                ref={isLastInterviewer ? lastOrbRef : undefined}
                className="mt-[1px] flex-shrink-0"
              >
                <AshMark size={16} state={orbState} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ ...rEyebrow, marginBottom: 3 }}>Ash</div>
                <div
                  style={{ color: R_INK, fontFamily: R_MONO, fontSize: 14, lineHeight: 1.62 }}
                >
                {m.content ? (
                  shouldTypewriter(i, m.role) ? (
                    <TypewriterMessage text={m.content} />
                  ) : (
                    m.content
                  )
                ) : isStreamingNow ? (
                  <TypingIndicator />
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                )}
                {m.citations && m.citations.length > 0 && (
                  <CitationsRow citations={m.citations} />
                )}
                </div>
              </div>
            </div>
          );
        })}
        {hasHangingUserTurn && (
          <div style={{ border: `1px solid ${R_ACCENT}`, padding: 12, fontFamily: R_MONO, fontSize: 12, color: R_INK }}>
            <div style={{ marginBottom: 8 }}>
              The interviewer didn&apos;t reply to your last message — the turn was interrupted (tab close or network blip).
            </div>
            <button
              onClick={retryLastUserTurn}
              className="px-2.5 py-1"
              style={{ fontFamily: R_MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: R_ACCENT_TEXT, color: '#FFFFFF', border: 'none' }}
            >
              ↻ Retry that turn
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Inline "Submit for scoring" CTA — only after 3 turns each (msg ≥6),
          hidden during streaming and after submission. The CTA itself owns
          its confirm-modal state via SubmitForScoringButton. */}
      {endSessionAction && !ended && !streaming && messages.length >= 6 && (
        <InlineSubmitCTA
          sessionId={sessionId}
          endSessionAction={endSessionAction}
          messageCount={messages.length}
        />
      )}
      {(timeUp || pasteBlocked || turnStartedAt !== null) && (
        <div className="px-5 pt-2 flex flex-col gap-1" aria-live="polite">
          {timeUp && (
            <span role="status" style={{ fontFamily: R_MONO, fontSize: 11, color: R_ACCENT_TEXT }}>
              Time&apos;s up. Give your recommendation, then submit for scoring below.
            </span>
          )}
          {pasteBlocked && !timeUp && (
            <span style={{ fontFamily: R_MONO, fontSize: 11, color: R_MUTE }}>
              Paste is off — type your answer, like a real interview.
            </span>
          )}
          {!timeUp && turnStartedAt !== null && (
            <TurnPressureNote turnStartedAt={turnStartedAt} />
          )}
        </div>
      )}
      <div className="px-5 pb-5 pt-2 flex gap-2" style={{ borderTop: `1px solid ${R_HAIR}` }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          onPaste={(e) => {
            e.preventDefault();
            setPasteBlocked(true);
            window.setTimeout(() => setPasteBlocked(false), 4000);
          }}
          placeholder={timeUp ? 'Time is up — submit for scoring' : 'Your response…'}
          className="flex-1 px-3 py-2 focus:outline-none"
          style={{
            fontFamily: R_MONO,
            fontSize: 14,
            background: '#FFFFFF',
            border: `1px solid ${R_HAIR}`,
            color: R_INK,
          }}
          disabled={streaming || !!timeUp}
        />
        <MicButton
          sessionId={sessionId}
          disabled={streaming || !!timeUp}
          onTranscript={(text) => {
            // Don't auto-send. Drop into the input so the user can fix any
            // misheard term (Whisper Indian-English WER is non-zero — "DCF"
            // can come back as "decaf"). If there's already typed text,
            // append with a leading space rather than clobbering it.
            setInput((prev) => (prev.trim() ? `${prev} ${text}` : text));
            // Best-effort focus so the user can edit immediately.
            inputRef.current?.focus();
          }}
        />
        {streaming ? (
          <button
            onClick={stopStreaming}
            aria-label="Stop the interviewer's reply"
            className="px-4 py-2"
            style={{ minHeight: 40, fontFamily: R_MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: `1px solid ${R_HAIR}`, color: R_INK, background: '#FFFFFF' }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!!timeUp}
            aria-label="Send — messages are final, you cannot edit or unsend after this"
            className="px-4 py-2 disabled:opacity-40"
            style={{ minHeight: 40, fontFamily: R_MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', background: R_ACCENT_TEXT, color: '#FFFFFF', border: `1px solid ${R_ACCENT_TEXT}` }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
