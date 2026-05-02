'use client';

import { useState } from 'react';
import { ChatPanel } from './chat-panel';
import { CheatSheetPanel } from './cheat-sheet-panel';

// Solve-page main layout. Desktop: side-by-side chat + cheat sheet (md+).
// Mobile: tab-toggle (only one panel visible at a time, stays full-width).
// Otherwise stacking the two on mobile gives a tiny chat that scrolls forever.

export function SolveLayout({
  sessionId,
  initialMessages,
  initialCs,
}: {
  sessionId: string;
  initialMessages: any;
  initialCs: any;
}) {
  const [mobileTab, setMobileTab] = useState<'chat' | 'sheet'>('chat');

  return (
    <>
      {/* Mobile tab toggle (hidden md+) */}
      <div className="md:hidden flex border-b border-zinc-800">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 text-xs py-2 ${mobileTab === 'chat' ? 'text-emerald-300 border-b-2 border-emerald-400 -mb-px' : 'text-zinc-500'}`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setMobileTab('sheet')}
          className={`flex-1 text-xs py-2 ${mobileTab === 'sheet' ? 'text-emerald-300 border-b-2 border-emerald-400 -mb-px' : 'text-zinc-500'}`}
        >
          📋 Cheat sheet
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-zinc-800 overflow-hidden">
        <div className={mobileTab === 'chat' ? 'block' : 'hidden md:block'}>
          <ChatPanel sessionId={sessionId} initial={initialMessages} />
        </div>
        <div className={mobileTab === 'sheet' ? 'block' : 'hidden md:block'}>
          <CheatSheetPanel sessionId={sessionId} initial={initialCs} />
        </div>
      </div>
    </>
  );
}
