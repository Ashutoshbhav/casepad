'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChatPanel } from './chat-panel';
import { IssueTreePanel } from './issue-tree-panel';
import { AshMark } from './ash-mark';
import { useAsteriskScene, useAsteriskPaused } from '@/hooks/use-asterisk-scene';
import { EASE, DURATION, INSTANT } from '@/lib/motion-tokens';
import { SubmitForScoringButton } from './submit-for-scoring-button';
import { XpTicker } from './xp-ticker';

// Solve-page main layout — header + body.
//
// Desktop: header (glyph + title + submit button)
//          body = chat (left ~50%) | issue tree (right ~50%), no card chrome.
//
// Mobile:  header is the same.
//          body = single panel via tab toggle (chat | tree) with the
//          existing liquid-tutor cross-fade between tabs.
//
// 2026-05-29: the cheat-sheet drawer was removed from the UI. The cohort
// flagged the side-drawer as breaking conversation flow, and the issue
// tree already surfaces the candidate's live reasoning (framework +
// numbers committed + decisions). /api/cheatsheet + the cheat_sheets
// table continue to run in the background — the data still feeds the
// evaluator at end-of-session — only the UI surface is gone.

type Tab = 'chat' | 'tree';

function difficultyDotCount(d: string): number {
  if (d === 'easy') return 1;
  if (d === 'medium') return 2;
  return 3;
}

// Pinned problem statement banner — replaces the hidden <details>
// accordion that previously lived at page bottom. Three states:
//   1. "expanded" — full prompt visible (default before first user turn)
//   2. "auto-collapsed" — 1-line teaser after the user has taken a turn,
//      preserves their chat real estate but the prompt is one click away
//   3. "manually expanded" — user clicked the teaser to bring it back
// Local state overrides auto-collapse so user intent always wins.
function ProblemStatementBanner({
  text,
  autoCollapsedAfterFirstTurn,
}: {
  text: string;
  autoCollapsedAfterFirstTurn: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !autoCollapsedAfterFirstTurn;
  return (
    <div
      className="px-6 sm:px-8 py-3"
      style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-sunken)',
      }}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Case prompt
        </span>
        <span
          className="meta-label flex-1 truncate"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {open ? '— hide' : '— click to expand'}
        </span>
      </button>
      {open && (
        <p
          className="font-body text-[14px] leading-[1.6] mt-2 max-w-[80ch]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

function HeaderDots({ d }: { d: string }) {
  const fill = difficultyDotCount(d);
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background: i < fill ? 'var(--color-accent)' : 'transparent',
            border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
          }}
        />
      ))}
    </span>
  );
}

export function SolveLayout({
  sessionId,
  caseTitle,
  caseDifficulty,
  caseSource,
  problemStatement,
  endSessionAction,
  initialMessages,
  initialCs,
  ended,
}: {
  sessionId: string;
  caseTitle: string;
  caseDifficulty: string;
  caseSource: string | null;
  problemStatement?: string;
  endSessionAction: () => Promise<void> | void;
  initialMessages: any;
  initialCs: any;
  ended?: boolean;
}) {
  const reduced = useReducedMotion();
  const [mobileTab, setMobileTab] = useState<Tab>('chat');
  const [treeRefresh, setTreeRefresh] = useState(0);
  const [is3DEligible, setIs3DEligible] = useState(false);
  const [streaming, setStreaming] = useState(false);
  // Lifted up from ChatPanel — drives toolbar submit-button disabled state.
  // Initial value mirrors the server-rendered transcript so the toolbar
  // button doesn't flicker enabled/disabled on first paint.
  const [messageCount, setMessageCount] = useState<number>(
    Array.isArray(initialMessages) ? initialMessages.length : 0
  );
  // Lifted messages array — drives XP ticker. Backfills from server-rendered
  // initialMessages so resume/refresh of an in-progress session shows correct
  // accumulated XP on first paint, not zero.
  const [messagesArr, setMessagesArr] = useState<{ role: 'user' | 'interviewer'; content: string }[]>(
    Array.isArray(initialMessages) ? initialMessages : []
  );
  // Talk-to-Ash-first gate: enable from messageCount ≥ 2 (Ash's opener +
  // at least one user turn). Always enabled once a session is ended (the
  // button flips into the "see debrief" link variant inside the component).
  const submitDisabled = !ended && messageCount < 2;
  const submitDisabledReason =
    messageCount === 0
      ? 'Talk to Ash first.'
      : 'Talk to Ash first.';

  // Register 'solve' preset on the persistent canvas — flies the asterisk
  // to the top-left corner at 10% scale, no parallax, no particles.
  useAsteriskScene('solve');
  // Pause the canvas's useFrame while chat is streaming to keep GPU free
  // for live token rendering. Existing onStreamingChange wire from
  // ChatPanel feeds `streaming` state below.
  useAsteriskPaused(streaming);

  // Track which sibling-set in the tree is "committed" (last user-active
  // root branch). Children of that branch render normally; siblings tuck.
  const [committedRootId, setCommittedRootId] = useState<string | null>(null);

  const onTurnComplete = () => setTreeRefresh((n) => n + 1);

  // Eligibility mirror — for the 2D fallback only. Eligible clients let
  // the persistent layout-level canvas paint the corner asterisk; we
  // leave a 36px placeholder in the header to preserve alignment.
  // Width gate removed 2026-05-04 — mobile now gets the tuned 3D scene.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduced) return;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) setIs3DEligible(true);
    } catch {
      // WebGL2 unsupported — stay on 2D fallback.
    }
  }, [reduced]);

  const renderTab = (t: Tab) => {
    if (t === 'chat') {
      return (
        <ChatPanel
          sessionId={sessionId}
          initial={initialMessages}
          onTurnComplete={onTurnComplete}
          onStreamingChange={setStreaming}
          onMessagesChange={setMessageCount}
          onMessagesArrayChange={setMessagesArr}
          endSessionAction={endSessionAction}
          ended={ended}
        />
      );
    }
    // 'tree' is the only remaining non-chat tab. Cheat-sheet drawer was
    // removed 2026-05-29 — issue tree carries the live-reasoning surface.
    return (
      <IssueTreePanel
        sessionId={sessionId}
        refreshTrigger={treeRefresh}
        committedRootId={committedRootId}
        onCommitRoot={setCommittedRootId}
      />
    );
  };

  return (
    <>
      {/* Interview-room backdrop — a calm warm wash behind everything: soft
          light at the top (the "table" in focus) settling into the canvas
          below (the "room"). Replaces the old sketchy notebook-paper SVG.
          Fixed, behind all content, no interaction. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1, // BEHIND all content. An opaque z-index:0 fixed layer was
                      // painting OVER the chat / prompt / tree (those are static,
                      // so a positioned z-0 sibling stacks above them) — that's
                      // why the page looked blank. -1 puts it behind everything.
          pointerEvents: 'none',
          // Warm interview-room wash you can actually feel: a soft pool of warm
          // light up top (the table) over a calm cream room, deepening slightly
          // at the edges. Dark text keeps full contrast on cream.
          background:
            'radial-gradient(120% 80% at 50% -6%, var(--hupr-cream) 0%, var(--hupr-cream) 34%, var(--hupr-sand) 140%)',
        }}
      />
      {/* HEADER — minimal chrome, glyph + title + tools. */}
      <header
        data-tour="solve-header"
        className="px-6 sm:px-8 py-4 flex items-center justify-between gap-3"
        style={{ position: 'relative', zIndex: 2, background: 'color-mix(in srgb, var(--color-bg-canvas) 82%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className="hidden sm:block flex-shrink-0">
            {/* On 3D-eligible clients the persistent layout-level canvas
                paints the asterisk into the top-left corner via the
                'solve' preset; this 36px placeholder reserves header
                alignment. Ineligible clients see the 2D fallback. */}
            {is3DEligible ? (
              <span style={{ display: 'inline-block', width: 36, height: 36 }} aria-hidden="true" />
            ) : (
              <AshMark size={28} state="idle" />
            )}
          </div>
          <div className="min-w-0">
            <div className="meta-label flex items-center gap-2">
              <span>{caseDifficulty}</span>
              <HeaderDots d={caseDifficulty} />
              {caseSource && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{caseSource}</span>
                </>
              )}
            </div>
            <h1
              className="font-headline text-base sm:text-lg truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {caseTitle}
            </h1>
            {/* Calm accent rule under the case title — replaces the sketchy
                hand-drawn underline. */}
            <div
              className="mt-1.5"
              style={{ width: 56, height: 2, background: 'var(--color-accent)', borderRadius: 1 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live XP ticker — pure derived state from messages array, no
              persistence. Only the LLM-graded /api/evaluate score is the
              source of truth at submit. This is the gamified "your turn
              registered" feedback to fix cohort signal "AI feels boring". */}
          <XpTicker messages={messagesArr} />
          <SubmitForScoringButton
            sessionId={sessionId}
            endSessionAction={endSessionAction}
            variant="toolbar"
            disabled={submitDisabled}
            disabledReason={submitDisabledReason}
            ended={ended}
          />
        </div>
      </header>

      {/* PROBLEM STATEMENT — pinned below header. Expanded by default
          before the candidate types (so they SEE the case prompt, instead
          of hunting for it in a collapsed accordion at page bottom).
          Auto-collapses to a 1-line teaser after the first user turn so
          the chat has more room. Click to re-expand any time. The teaser
          is ALWAYS clickable — Agent 2 #12, "the user should never have
          to hunt for the case prompt mid-interview". */}
      {problemStatement && (
        <ProblemStatementBanner
          text={problemStatement}
          autoCollapsedAfterFirstTurn={messageCount >= 2}
        />
      )}

      {/* Mobile tab toggle (hidden md+) — chat | tree. 'sheet' tab dropped
          2026-05-29 along with the cheat-sheet drawer surface. */}
      <div className="md:hidden flex">
        {(['chat', 'tree'] as const).map((t) => {
          const active = mobileTab === t;
          return (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              className="flex-1 font-mono text-[11px] uppercase tracking-[0.16em] py-2.5"
              style={{
                color: active
                  ? 'var(--color-accent)'
                  : 'var(--color-text-muted)',
                borderBottom: active
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Mobile: animated single-panel view. popLayout lets the outgoing
          panel exit while the incoming panel mounts in parallel — no wait,
          no stutter. Both panels are absolute-positioned so the toggle
          never reflows the page. Transform + opacity only. */}
      <div className="md:hidden flex-1 overflow-hidden relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={mobileTab}
            initial={
              reduced
                ? { opacity: 1 }
                : { opacity: 0, x: 12 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, x: -12 }
            }
            transition={
              reduced
                ? INSTANT
                : { duration: DURATION.micro, ease: EASE.expo }
            }
            className="absolute inset-0 overflow-hidden"
            data-tour={`solve-${mobileTab}`}
            style={{ willChange: 'transform, opacity' }}
          >
            {renderTab(mobileTab)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop: 2-col, chat | tree. No card chrome around panels. */}
      <div className="hidden md:grid flex-1 grid-cols-2 overflow-hidden">
        <div data-tour="solve-chat" className="overflow-hidden">
          <ChatPanel
            sessionId={sessionId}
            initial={initialMessages}
            onTurnComplete={onTurnComplete}
            onStreamingChange={setStreaming}
            onMessagesChange={setMessageCount}
            onMessagesArrayChange={setMessagesArr}
            endSessionAction={endSessionAction}
            ended={ended}
          />
        </div>
        <div
          data-tour="solve-tree"
          className="overflow-hidden"
          style={{ borderLeft: '1px solid var(--color-border)' }}
        >
          <IssueTreePanel
            sessionId={sessionId}
            refreshTrigger={treeRefresh}
            committedRootId={committedRootId}
            onCommitRoot={setCommittedRootId}
          />
        </div>
      </div>

    </>
  );
}
