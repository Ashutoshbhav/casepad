'use client';

import { useState } from 'react';
import { ChatPanel } from './chat-panel';
import { CheatSheetPanel } from './cheat-sheet-panel';
import { IssueTreePanel } from './issue-tree-panel';

// Solve-page main layout. Desktop: 3 panels side-by-side (chat | tree | sheet)
// at md+. Mobile: tab-toggle between chat / tree / sheet (only one visible at
// a time so each panel has full width).

export function SolveLayout({
  sessionId,
  initialMessages,
  initialCs,
}: {
  sessionId: string;
  initialMessages: any;
  initialCs: any;
}) {
  const [mobileTab, setMobileTab] = useState<'chat' | 'tree' | 'sheet'>('chat');
  const [treeRefresh, setTreeRefresh] = useState(0);
  const onTurnComplete = () => setTreeRefresh((n) => n + 1);

  return (
    <>
      {/* Mobile tab toggle (hidden md+) */}
      <div className="md:hidden flex border-b border-zinc-800">
        {(['chat', 'tree', 'sheet'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 text-xs py-2 ${mobileTab === t ? 'text-emerald-300 border-b-2 border-emerald-400 -mb-px' : 'text-zinc-500'}`}
          >
            {t === 'chat' ? '💬 Chat' : t === 'tree' ? '🌳 Tree' : '📋 Sheet'}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px_1fr] md:divide-x md:divide-zinc-800 overflow-hidden">
        <div data-tour="solve-chat" className={mobileTab === 'chat' ? 'block overflow-hidden' : 'hidden md:block overflow-hidden'}>
          <ChatPanel sessionId={sessionId} initial={initialMessages} onTurnComplete={onTurnComplete} />
        </div>
        <div data-tour="solve-tree" className={mobileTab === 'tree' ? 'block overflow-hidden' : 'hidden md:block overflow-hidden'}>
          <IssueTreePanel sessionId={sessionId} refreshTrigger={treeRefresh} />
        </div>
        <div data-tour="solve-sheet" className={mobileTab === 'sheet' ? 'block overflow-hidden' : 'hidden md:block overflow-hidden'}>
          <CheatSheetPanel sessionId={sessionId} initial={initialCs} />
        </div>
      </div>
    </>
  );
}
