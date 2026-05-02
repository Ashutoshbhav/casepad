'use client';

import { useState } from 'react';
import { TRACKS, type Track } from '@/lib/tracks';

// Live in-solve hint panel — small floating button bottom-right of the solve
// arena. Click to surface a context-relevant cheat-sheet snippet OR a recovery
// script. Doesn't auto-pop (don't be intrusive); user opens when stuck.
export function InSolveHintPanel({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'frameworks' | 'math' | 'recovery' | 'spike'>('recovery');
  const def = TRACKS[track];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Need a hint?"
        className="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-lg shadow-lg"
      >
        ⚡
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 sm:w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-emerald-700 bg-zinc-950 shadow-2xl">
      <header className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs uppercase text-emerald-300">⚡ Hint</span>
        <button onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300">×</button>
      </header>
      <nav className="flex gap-1 px-2 py-1 border-b border-zinc-800 text-xs">
        {(['recovery', 'frameworks', 'math', 'spike'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-1 rounded ${view === v ? 'bg-zinc-800 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {v}
          </button>
        ))}
      </nav>
      <div className="p-3 text-xs text-zinc-200 space-y-2">
        {view === 'recovery' && (
          <>
            <p className="text-zinc-400">If you&apos;re blanked or panicked, say one of these aloud and breathe:</p>
            {def.recovery_scripts.map((r, i) => (
              <div key={i} className="rounded bg-zinc-900 p-2 italic">&quot;{r}&quot;</div>
            ))}
          </>
        )}
        {view === 'frameworks' && (
          <ul className="space-y-2">
            {def.frameworks.map((f) => (
              <li key={f.name}>
                <div className="text-emerald-300 font-medium">{f.name}</div>
                <div className="text-zinc-500">{f.when_to_use}</div>
              </li>
            ))}
          </ul>
        )}
        {view === 'math' && (
          <ul className="space-y-1.5">
            {def.math.map((m) => (
              <li key={m.name}>
                <span className="text-amber-300">{m.name}</span> · <code className="text-zinc-300">{m.formula}</code>
              </li>
            ))}
          </ul>
        )}
        {view === 'spike' && (
          <ul className="space-y-1.5 italic text-violet-200">
            {def.killer_phrases.map((p, i) => <li key={i}>&quot;{p}&quot;</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
