'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChatPanel } from './chat-panel';
import { CheatSheetPanel } from './cheat-sheet-panel';
import { IssueTreePanel } from './issue-tree-panel';
import { AshMark } from './ash-mark';
import { SheetDrawer } from './sheet-drawer';
import { useAsteriskScene, useAsteriskPaused } from '@/hooks/use-asterisk-scene';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';
import { EASE, DURATION, INSTANT } from '@/lib/motion-tokens';
import { SubmitForScoringButton } from './submit-for-scoring-button';
import { XpTicker } from './xp-ticker';

// Solve-page main layout — header + body + drawer.
//
// Desktop: header (glyph + title + cheat-sheet button + end-session button)
//          body = chat (left ~50%) | tree (right ~50%), no card chrome.
//          Cheat sheet lives in a right-side drawer (toggled from header).
//
// Mobile:  header is the same.
//          body = single panel via tab toggle (chat | tree | sheet) with the
//          existing liquid-tutor cross-fade between tabs.
//
// Cheat-sheet panel is ALWAYS mounted (translateX off-screen on desktop when
// drawer is closed) so its supabase realtime subscription survives a close.

type Tab = 'chat' | 'tree' | 'sheet';

function difficultyDotCount(d: string): number {
  if (d === 'easy') return 1;
  if (d === 'medium') return 2;
  return 3;
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
  endSessionAction,
  initialMessages,
  initialCs,
  ended,
}: {
  sessionId: string;
  caseTitle: string;
  caseDifficulty: string;
  caseSource: string | null;
  endSessionAction: () => Promise<void> | void;
  initialMessages: any;
  initialCs: any;
  ended?: boolean;
}) {
  const reduced = useReducedMotion();
  const [mobileTab, setMobileTab] = useState<Tab>('chat');
  const [treeRefresh, setTreeRefresh] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Drawer-open ↔ aiState='listening'. While the cheat sheet is open
  // Ash "steps aside" so the user can study; when it closes we step the
  // asterisk back to idle. Higher-priority states (approving / celebrating)
  // are protected by the priority gate; the explicit force=true close-out
  // only fires if we're actually still in 'listening'.
  useEffect(() => {
    if (!drawerOpen) return;
    try {
      const setAiState = useAsteriskSceneStore.getState().setAiState;
      setAiState('listening');
      return () => {
        try {
          const cur = useAsteriskSceneStore.getState().aiState;
          if (cur === 'listening') setAiState('idle', { force: true });
        } catch (e) {
          console.warn('[solve-layout] setAiState(idle) failed:', e);
        }
      };
    } catch (e) {
      console.warn('[solve-layout] setAiState(listening) failed:', e);
    }
  }, [drawerOpen]);

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
    if (t === 'tree') {
      return (
        <IssueTreePanel
          sessionId={sessionId}
          refreshTrigger={treeRefresh}
          committedRootId={committedRootId}
          onCommitRoot={setCommittedRootId}
        />
      );
    }
    return <CheatSheetPanel sessionId={sessionId} initial={initialCs} />;
  };

  return (
    <>
      {/* HEADER — minimal chrome, glyph + title + tools. */}
      <header
        data-tour="solve-header"
        className="px-6 sm:px-8 py-4 flex items-center justify-between gap-3"
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live XP ticker — pure derived state from messages array, no
              persistence. Only the LLM-graded /api/evaluate score is the
              source of truth at submit. This is the gamified "your turn
              registered" feedback to fix cohort signal "AI feels boring". */}
          <XpTicker messages={messagesArr} />
          {/* Cheat sheet toggle — hidden on mobile (mobile uses tab toggle).
              Hover state via CSS class (ghost-btn) rather than JS to avoid
              style-mutation churn under fast pointer moves. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ghost-btn ghost-btn--accent hidden md:inline-flex font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 rounded"
            data-tour="solve-sheet-toggle"
          >
            Cheat sheet
          </button>
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

      {/* Mobile tab toggle (hidden md+) */}
      <div className="md:hidden flex">
        {(['chat', 'tree', 'sheet'] as const).map((t) => {
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

      {/* Desktop drawer — Cheat sheet slides in from the right. The
          CheatSheetPanel is mounted inside the drawer; its supabase
          subscription only fires while the drawer is open, but its initial
          server-rendered state is preserved across opens. */}
      <SheetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Cheat sheet"
      >
        <CheatSheetPanel sessionId={sessionId} initial={initialCs} />
      </SheetDrawer>
    </>
  );
}
