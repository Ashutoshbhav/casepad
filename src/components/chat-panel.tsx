'use client';
import { useState, useRef, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { TypewriterMessage } from './typewriter-message';
import { AshMark } from './ash-mark';
import { DisperseParticles } from './disperse-particles';
import { MicButton } from './mic-button';
import { InlineSubmitCTA } from './inline-submit-cta';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';
// Shared with /api/chat — DO NOT duplicate the strings here. The route handler
// detects verbatim copy-pastes of these templates and nudges the candidate
// for original thinking; both ends MUST read from the same source.
import { FIRST_TURN_SUGGESTIONS } from '@/lib/canned-templates';

// §7.1 Trust UX — interviewer turns may carry optional `citations` from the
// playbook RAG retriever. Field is OPTIONAL and additive: legacy transcripts
// (no field) and user turns continue to render exactly as before.
type Citation = { section: string; sourceUrl?: string; text: string };
type Msg = {
  role: 'user' | 'interviewer';
  content: string;
  citations?: Citation[];
};

export function ChatPanel({
  sessionId,
  initial,
  onTurnComplete,
  onMessagesChange,
  onMessagesArrayChange,
  onStreamingChange,
  endSessionAction,
  ended,
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
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastOrbRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
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
    sendUserTurn(lastMsg.content, true);
  };

  const sendUserTurn = async (text: string, alreadyAppended = false) => {
    if (!text.trim() || streaming) return;
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
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userTurn: text }),
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
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
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
    } finally {
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
    <div className="flex flex-col h-full">
      {disperse && (
        <DisperseParticles
          key={disperse.key}
          fromX={disperse.fromX}
          fromY={disperse.fromY}
          toX={disperse.toX}
          toY={disperse.toY}
        />
      )}
      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10 space-y-6">
        {isEmpty && (
          <div
            className="rounded-md p-4"
            style={{
              background: 'var(--color-bg-elevated)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="font-mono text-[11px] uppercase tracking-[0.16em] mb-2"
              style={{ color: 'var(--color-accent)' }}
            >
              First turn — pick a move
            </div>
            <p
              className="text-xs leading-relaxed mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Real case interviews start with you taking the lead. Click any of these to drop a suggested opening into the chat — then edit it to fit the case before sending.
            </p>
            <div className="flex flex-col gap-1.5">
              {FIRST_TURN_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.text)}
                  className="text-xs text-left px-3 py-2 rounded-md transition-colors"
                  style={{
                    background: 'var(--color-bg-sunken)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div
              className="text-[10px] mt-3 italic"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Tip: the prompt is intentionally short, like a real interview. Your job is to ask for data and build structure as you go. Tree + cheat sheet auto-fill from your chat.
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          if (isUser) {
            // User message — Geist sans, slightly muted bg block.
            return (
              <div
                key={i}
                className="rounded-md px-4 py-3 text-sm leading-relaxed font-body"
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {m.content || (
                  <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                )}
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
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Ash · EM at Bain
                </div>
                <div
                  className="leading-[1.5] max-w-[60ch]"
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontSize: 17,
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {m.content ? (
                    shouldTypewriter(i, m.role) ? (
                      <TypewriterMessage text={m.content} />
                    ) : (
                      m.content
                    )
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
                className="mt-[-2px] flex-shrink-0"
              >
                <AshMark size={18} state={orbState} />
              </div>
              <div
                className="flex-1 min-w-0 py-1 font-body text-[15px] leading-[1.6]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {m.content ? (
                  shouldTypewriter(i, m.role) ? (
                    <TypewriterMessage text={m.content} />
                  ) : (
                    m.content
                  )
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                )}
                {m.citations && m.citations.length > 0 && (
                  <CitationsRow citations={m.citations} />
                )}
              </div>
            </div>
          );
        })}
        {hasHangingUserTurn && (
          <div
            className="rounded-md p-3 text-xs"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-bright)',
            }}
          >
            <div className="mb-1.5">
              The interviewer didn&apos;t reply to your last message — the previous turn was interrupted (tab close or network blip).
            </div>
            <button
              onClick={retryLastUserTurn}
              className="text-xs px-2.5 py-1 rounded-md transition-opacity hover:opacity-90"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
              }}
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
      <div className="px-4 pb-4 pt-2 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the interviewer…"
          className="flex-1 rounded-md px-3 py-2 text-sm focus:outline-none"
          style={{
            background: 'var(--color-bg-sunken)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          disabled={streaming}
        />
        <MicButton
          sessionId={sessionId}
          disabled={streaming}
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
        <button
          onClick={send}
          disabled={streaming}
          className="ghost-btn ghost-btn--accent px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
