'use client';

import { useState } from 'react';
import { TRACKS, type Track } from '@/lib/tracks';

const TABS = ['Frameworks', 'Math', 'Recovery', 'Spike Phrases', 'Weakness focus', 'Ask anything', 'Behavioral STAR'] as const;
type Tab = typeof TABS[number];

export function CheatsheetTabs({
  track,
  weakestDims,
  weakestStats,
}: {
  track: Track;
  weakestDims: string[];
  weakestStats: { dim: string; avg: number; weight: number; ratio: number }[];
}) {
  const [tab, setTab] = useState<Tab>('Weakness focus');
  const def = TRACKS[track];

  return (
    <div>
      <nav className="flex gap-2 border-b border-zinc-800 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-2 whitespace-nowrap ${
              tab === t ? 'text-emerald-300 border-b-2 border-emerald-400 -mb-px' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Weakness focus' && (
        <section className="space-y-4">
          <p className="text-sm text-zinc-400">
            Sorted by your lowest performance across last {weakestStats.length || 0} sessions. Drill the top item first.
          </p>
          {weakestStats.length === 0 ? (
            <div className="text-sm text-zinc-500 rounded border border-zinc-800 p-4">
              No completed cases yet. Complete 1-2 cases to populate this.
            </div>
          ) : (
            <ul className="space-y-2">
              {weakestStats.map((s, i) => (
                <li key={s.dim} className="rounded border border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-zinc-100 capitalize">{s.dim.replace(/_/g, ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.ratio < 0.6 ? 'bg-rose-900/50 text-rose-200' : s.ratio < 0.75 ? 'bg-amber-900/50 text-amber-200' : 'bg-emerald-900/50 text-emerald-200'}`}>
                      {(s.ratio * 100).toFixed(0)}% of weight
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">avg {s.avg.toFixed(1)} of {s.weight} max</div>
                  {i === 0 && s.ratio < 0.7 && (
                    <div className="mt-2 text-xs text-amber-300">⚠ This is your priority focus.</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'Frameworks' && (
        <section className="space-y-3">
          {def.frameworks.map((f) => (
            <div key={f.name} className="rounded border border-zinc-800 p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-medium text-emerald-300">{f.name}</h3>
                <span className="text-xs text-zinc-500">when: {f.when_to_use}</span>
              </div>
              <ul className="text-sm text-zinc-300 mt-2 space-y-0.5">
                {f.structure.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
              <CohortNotes scope="framework" scope_id={`${track}:${f.name}`} />
            </div>
          ))}
        </section>
      )}

      {tab === 'Math' && (
        <section className="space-y-2">
          {def.math.map((m) => (
            <div key={m.name} className="rounded border border-zinc-800 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-amber-300 font-medium text-sm">{m.name}</span>
                <code className="text-xs text-zinc-300 font-mono">{m.formula}</code>
              </div>
              {m.mnemonic && <div className="text-xs text-zinc-500 mt-1">↳ {m.mnemonic}</div>}
            </div>
          ))}
          {def.math.length === 0 && <div className="text-sm text-zinc-500">No math drills for this track.</div>}
        </section>
      )}

      {tab === 'Recovery' && (
        <section className="space-y-3">
          <p className="text-sm text-zinc-400">When you blank mid-case, default to one of these scripts:</p>
          {def.recovery_scripts.map((r, i) => (
            <div key={i} className="rounded border border-zinc-800 p-4 text-sm italic text-zinc-200">
              &quot;{r}&quot;
            </div>
          ))}
        </section>
      )}

      {tab === 'Spike Phrases' && (
        <section className="space-y-3">
          <p className="text-sm text-zinc-400">L4 moves that elevate 3 → 4 in interviewer&apos;s mind:</p>
          {def.killer_phrases.map((p, i) => (
            <div key={i} className="rounded border border-violet-900 p-4 text-sm italic text-violet-200">
              &quot;{p}&quot;
            </div>
          ))}
        </section>
      )}

      {tab === 'Ask anything' && <AskTheCheatSheet track={track} weakestDims={weakestDims} />}

      {tab === 'Behavioral STAR' && <BehavioralSection />}
    </div>
  );
}

function AskTheCheatSheet({ track, weakestDims }: { track: Track; weakestDims: string[] }) {
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setA('');
    try {
      const r = await fetch('/api/ask-cheatsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, track, weakestDims }),
      });
      const data = await r.json();
      setA(data.answer || 'No answer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <p className="text-sm text-zinc-400 mb-3">Ask a question — answered using your track&apos;s frameworks/math + your weak areas.</p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. 'What's a clean way to structure a market entry case for a B2B SaaS in India?'"
        className="w-full h-24 rounded-md bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-zinc-600"
      />
      <button
        onClick={ask}
        disabled={loading || !q.trim()}
        className="mt-2 rounded-md bg-white text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Thinking…' : 'Ask'}
      </button>
      {a && (
        <div className="mt-4 rounded border border-zinc-800 p-4 text-sm text-zinc-200 whitespace-pre-wrap">{a}</div>
      )}
    </section>
  );
}

function CohortNotes({ scope, scope_id }: { scope: string; scope_id: string }) {
  const [notes, setNotes] = useState<{ id: string; body: string; upvotes: number }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const load = async () => {
    if (loaded) return;
    const r = await fetch(`/api/cohort-notes?scope=${encodeURIComponent(scope)}&scope_id=${encodeURIComponent(scope_id)}`);
    const data = await r.json();
    setNotes(data.notes || []);
    setLoaded(true);
  };

  const submit = async () => {
    if (!draft.trim()) return;
    const r = await fetch('/api/cohort-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, scope_id, body: draft }),
    });
    const data = await r.json();
    if (data.note) {
      setNotes((n) => [{ id: data.note.id, body: data.note.body, upvotes: 0 }, ...n]);
      setDraft('');
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-900">
      <button onClick={() => { setOpen(!open); load(); }} className="text-xs text-zinc-500 hover:text-zinc-300">
        {open ? '▾' : '▸'} Cohort spike notes ({loaded ? notes.length : '…'})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="text-xs text-zinc-300 bg-zinc-900 rounded p-2">{n.body}</div>
          ))}
          {notes.length === 0 && loaded && <div className="text-xs text-zinc-600 italic">No notes yet — be the first.</div>}
          <div className="flex gap-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a spike note (max 1000 chars)" className="flex-1 text-xs rounded bg-zinc-900 border border-zinc-800 px-2 py-1" />
            <button onClick={submit} className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BehavioralSection() {
  const def = TRACKS.behavioral;
  return (
    <section className="space-y-4">
      <p className="text-sm text-zinc-400">Behavioral / fit applies to every track. Cover these dimensions with concrete STAR stories.</p>
      <div className="rounded border border-zinc-800 p-4">
        <h3 className="font-medium text-zinc-100 mb-2">McKinsey PEI 2025 dimensions</h3>
        <ul className="text-sm space-y-1 text-zinc-300">
          <li>• <span className="text-emerald-300">Connection</span> — story showing you built a genuine relationship with stakeholder under tension</li>
          <li>• <span className="text-emerald-300">Drive</span> — story of pushing past a real obstacle (not a humblebrag)</li>
          <li>• <span className="text-emerald-300">Leadership</span> — story of influencing without authority</li>
          <li>• <span className="text-emerald-300">Growth</span> — story of learning from a setback (be honest)</li>
        </ul>
      </div>
      <div className="rounded border border-zinc-800 p-4">
        <h3 className="font-medium text-zinc-100 mb-2">STAR template</h3>
        <ol className="text-sm space-y-1 text-zinc-300">
          <li>1. <strong>Situation</strong>: when/where, 1 sentence</li>
          <li>2. <strong>Task</strong>: the specific goal you owned</li>
          <li>3. <strong>Action</strong>: what YOU (not the team) did, with reasoning</li>
          <li>4. <strong>Result</strong>: outcome with concrete numbers + what you learned</li>
        </ol>
      </div>
      <div className="rounded border border-zinc-800 p-4">
        <h3 className="font-medium text-zinc-100 mb-2">Killer phrases</h3>
        <ul className="text-xs space-y-1 italic text-violet-200">
          {def.killer_phrases.map((p, i) => <li key={i}>&quot;{p}&quot;</li>)}
        </ul>
      </div>
    </section>
  );
}
