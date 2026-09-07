'use client';

import { useState } from 'react';
import { ChatPanel } from './chat-panel';
import { IssueTreePanel } from './issue-tree-panel';
import { useAsteriskScene, useAsteriskPaused } from '@/hooks/use-asterisk-scene';
import { SubmitForScoringButton } from './submit-for-scoring-button';
import { InterviewClock } from './interview-clock';
import { XpTicker } from './xp-ticker';
import { roomFontVars } from '@/components/room/fonts';
import { A11yOptions } from '@/components/room/a11y-options';

// v2 "room" palette — transcript-as-document.
const INK = 'rgb(50,50,52)';
const CREAM = '#F5F0E8';
const HAIR = 'rgba(0,0,0,0.16)';
const ACCENT = '#f54e00'; // decorative rules only (not used as text)

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
      className="px-5 sm:px-8 py-3"
      style={{ borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.4)' }}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
        style={{ fontFamily: 'var(--font-room-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(50,50,52,0.62)' }}
      >
        <span>Case prompt</span>
        <span className="flex-1 truncate">{open ? '— hide' : '— tap to expand'}</span>
      </button>
      {open && (
        <p
          className="mt-2"
          style={{ fontFamily: 'var(--font-room-mono)', fontSize: 13.5, lineHeight: 1.62, color: 'rgba(50,50,52,0.8)', maxWidth: '80ch' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

export function SolveLayout({
  sessionId,
  caseTitle,
  caseDifficulty,
  caseSource,
  problemStatement,
  startedAt,
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
  startedAt?: string | null;
  endSessionAction: () => Promise<void> | void;
  initialMessages: any;
  initialCs: any;
  ended?: boolean;
}) {
  // Text-realism (PRD v3.1): a visible 25-min clock. At 0:00 we soft-lock the
  // composer and push the submit CTA — we never silently submit for the user.
  const [timeUp, setTimeUp] = useState(false);
  const [treeRefresh, setTreeRefresh] = useState(0);
  // Mobile: the issue tree is a collapsible strip below the transcript, OPEN by
  // default (Ash: "issue tree visible from the start, mobile + desktop"). It's
  // always mounted — this only toggles its height.
  const [mobileTreeOpen, setMobileTreeOpen] = useState(true);
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

  const chatPanel = (
    <ChatPanel
      sessionId={sessionId}
      initial={initialMessages}
      onTurnComplete={onTurnComplete}
      onStreamingChange={setStreaming}
      onMessagesChange={setMessageCount}
      onMessagesArrayChange={setMessagesArr}
      endSessionAction={endSessionAction}
      timeUp={timeUp}
      ended={ended}
    />
  );
  const treePanel = (
    <IssueTreePanel
      sessionId={sessionId}
      refreshTrigger={treeRefresh}
      committedRootId={committedRootId}
      onCommitRoot={setCommittedRootId}
    />
  );

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
          background: CREAM,
        }}
      />

      {/* HEADER — transcript-as-document masthead. */}
      <header
        data-room
        data-tour="solve-header"
        className={`${roomFontVars} px-5 sm:px-8 py-3.5 flex items-start justify-between gap-3`}
        style={{
          position: 'relative',
          zIndex: 2,
          background: 'rgba(245,240,232,0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${HAIR}`,
          color: INK,
        }}
      >
        <div className="min-w-0">
          <div
            style={{
              fontFamily: 'var(--font-room-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.62)',
              marginBottom: 4,
            }}
          >
            Practice room · {caseDifficulty}
            {caseSource ? ` · ${caseSource}` : ''}
          </div>
          <h1
            className="truncate"
            style={{
              fontFamily: 'var(--font-room-display)',
              fontWeight: 700,
              fontSize: 'clamp(15px, 2.2vw, 20px)',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {caseTitle}
          </h1>
          <div style={{ marginTop: 6, width: 44, height: 2, background: ACCENT }} aria-hidden="true" />
        </div>
        <div className={`${roomFontVars} flex items-center gap-2 flex-shrink-0`}>
          {startedAt && (
            <InterviewClock startedAt={startedAt} onExpire={() => setTimeUp(true)} paused={!!ended} />
          )}
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

      {/* PROBLEM STATEMENT — expanded by default, auto-collapses after the
          first user turn, always one tap from re-expanding. */}
      {problemStatement && (
        <div data-room className={roomFontVars} style={{ position: 'relative', zIndex: 2 }}>
          <ProblemStatementBanner
            text={problemStatement}
            autoCollapsedAfterFirstTurn={messageCount >= 2}
          />
        </div>
      )}

      <div data-room className={roomFontVars} style={{ position: 'relative', zIndex: 2, background: CREAM }}>
        <A11yOptions />
      </div>

      {/* BODY — transcript + issue tree. Desktop: side by side. Mobile: the
          transcript takes the room, the issue tree is a collapsible strip
          below it, OPEN by default (Ash: visible from the start on both).
          The tree is mounted ONCE and repositioned by CSS. */}
      <div
        data-room
        className={`${roomFontVars} flex-1 flex flex-col md:flex-row min-h-0`}
        style={{ position: 'relative', zIndex: 1, color: INK }}
      >
        <div data-tour="solve-chat" className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {chatPanel}
        </div>

        <div
          data-tour="solve-tree"
          className="solve-tree-col flex flex-col flex-shrink-0 md:flex-1 md:min-w-0 md:min-h-0"
          style={{ borderTop: `1px solid ${HAIR}` }}
        >
          <button
            type="button"
            className="md:hidden flex items-center justify-between w-full px-5 py-2.5"
            onClick={() => setMobileTreeOpen((o) => !o)}
            aria-expanded={mobileTreeOpen}
            style={{
              fontFamily: 'var(--font-room-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.62)',
              background: 'rgba(255,255,255,0.35)',
            }}
          >
            <span>Issue tree</span>
            <span aria-hidden="true">{mobileTreeOpen ? '▾' : '▸'}</span>
          </button>
          <div className="solve-tree-body" data-open={mobileTreeOpen}>
            {treePanel}
          </div>
        </div>
      </div>

      <style jsx>{`
        .solve-tree-col {
          border-left: none;
        }
        .solve-tree-body {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.25s ease;
        }
        .solve-tree-body[data-open='true'] {
          max-height: 46vh;
          overflow-y: auto;
        }
        @media (min-width: 768px) {
          .solve-tree-col {
            border-left: 1px solid ${HAIR};
            border-top: none !important;
          }
          .solve-tree-body,
          .solve-tree-body[data-open] {
            max-height: none;
            overflow: hidden;
            flex: 1;
            min-height: 0;
          }
        }
      `}</style>
    </>
  );
}
