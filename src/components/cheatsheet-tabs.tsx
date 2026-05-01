'use client';

import { useState } from 'react';
import { TRACKS, type Track } from '@/lib/tracks';
import { CONSULTING_FRAMEWORKS, CONSULTING_MATH, CONSULTING_INDUSTRY_PRIMERS, BEHAVIORAL_30 } from '@/lib/tracks-deep';
import { IB_FRAMEWORKS, IB_MATH, IB_INDUSTRY_PRIMERS } from '@/lib/tracks-deep-ib';
import { PM_FRAMEWORKS, PM_MATH, PM_INDUSTRY_PRIMERS, PM_APP_KPIS } from '@/lib/tracks-deep-pm';
import { MKT_FRAMEWORKS, MKT_MATH, MKT_INDUSTRY_PRIMERS } from '@/lib/tracks-deep-mkt';
import { STRATEGY_FRAMEWORKS, STRATEGY_MATH, STRATEGY_PRIMERS } from '@/lib/tracks-deep-strategy';

function frameworksFor(track: Track) {
  if (track === 'consulting') return CONSULTING_FRAMEWORKS;
  if (track === 'ib_pe_vc') return IB_FRAMEWORKS;
  if (track === 'pm') return PM_FRAMEWORKS;
  if (track === 'marketing') return MKT_FRAMEWORKS;
  if (track === 'strategy_bizops') return STRATEGY_FRAMEWORKS;
  return [];
}
function mathFor(track: Track) {
  if (track === 'consulting') return CONSULTING_MATH;
  if (track === 'ib_pe_vc') return IB_MATH;
  if (track === 'pm') return PM_MATH;
  if (track === 'marketing') return MKT_MATH;
  if (track === 'strategy_bizops') return STRATEGY_MATH;
  return [];
}
function primersFor(track: Track) {
  if (track === 'consulting') return CONSULTING_INDUSTRY_PRIMERS;
  if (track === 'ib_pe_vc') return IB_INDUSTRY_PRIMERS;
  if (track === 'pm') return PM_INDUSTRY_PRIMERS;
  if (track === 'marketing') return MKT_INDUSTRY_PRIMERS;
  if (track === 'strategy_bizops') return STRATEGY_PRIMERS;
  return [];
}

const TABS = ['Weakness focus', 'Frameworks', 'Math drills', 'Industry primers', 'Recovery', 'Spike Phrases', '30 behavioral Qs', 'Ask anything'] as const;
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
          {(frameworksFor(track).length ? frameworksFor(track) : def.frameworks.map(f => ({ name: f.name, when_to_use: f.when_to_use, when_NOT_to_use: '', structure: f.structure, example: '' }))).map((f: any) => (
            <div key={f.name} className="rounded border border-zinc-800 p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-medium text-emerald-300">{f.name}</h3>
              </div>
              <div className="text-xs text-zinc-500 mt-1"><span className="text-emerald-400">when:</span> {f.when_to_use}</div>
              {f.when_NOT_to_use && <div className="text-xs text-zinc-500"><span className="text-rose-400">NOT when:</span> {f.when_NOT_to_use}</div>}
              <ul className="text-sm text-zinc-300 mt-2 space-y-0.5">
                {f.structure.map((s: string, i: number) => <li key={i}>· {s}</li>)}
              </ul>
              {f.example && <div className="text-xs text-zinc-400 mt-2 italic">e.g. {f.example}</div>}
              <CohortNotes scope="framework" scope_id={`${track}:${f.name}`} />
            </div>
          ))}
        </section>
      )}

      {tab === 'Math drills' && (
        <section className="space-y-3">
          {[1,2,3,4].map((level) => {
            const drills = (mathFor(track).length ? mathFor(track) : def.math.map(m => ({ level: 1 as const, name: m.name, formula: m.formula, shortcut: m.mnemonic || '', example: '', threshold_to_advance: '' }))).filter((d: any) => d.level === level);
            if (drills.length === 0) return null;
            const colors = { 1: 'emerald', 2: 'sky', 3: 'amber', 4: 'rose' } as Record<number, string>;
            return (
              <div key={level} className="rounded border border-zinc-800 p-4">
                <h3 className={`text-sm font-semibold text-${colors[level]}-300 mb-2`}>Level {level} {level === 1 ? '(beginner)' : level === 2 ? '(core)' : level === 3 ? '(advanced)' : '(expert)'}</h3>
                <ul className="space-y-2">
                  {drills.map((d: any) => (
                    <li key={d.name} className="text-sm">
                      <div className="flex items-baseline justify-between">
                        <span className="text-amber-300 font-medium">{d.name}</span>
                        <code className="text-xs text-zinc-300 font-mono">{d.formula}</code>
                      </div>
                      {d.shortcut && <div className="text-xs text-zinc-500 mt-0.5">↳ shortcut: {d.shortcut}</div>}
                      {d.example && <div className="text-xs text-zinc-400 italic">e.g. {d.example}</div>}
                      {d.threshold_to_advance && <div className="text-xs text-emerald-400 mt-0.5">→ unlock next: {d.threshold_to_advance}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {tab === 'Industry primers' && (
        <section className="space-y-3">
          {primersFor(track).length > 0 ? primersFor(track).map((p: any) => (
            <div key={p.sector} className="rounded border border-zinc-800 p-4">
              <h3 className="font-medium text-emerald-300 mb-2">{p.sector}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300">
                <div><span className="text-zinc-500">Margins:</span> {p.typical_margin_range}</div>
                <div><span className="text-zinc-500">Cycle / KPI:</span> {p.cycle_or_kpi}</div>
                <div><span className="text-zinc-500">Cost drivers:</span> {p.cost_drivers.join(', ')}</div>
                <div><span className="text-zinc-500">Revenue drivers:</span> {p.revenue_drivers.join(', ')}</div>
              </div>
              <div className="text-xs text-zinc-400 mt-2"><span className="text-rose-300">Disruption:</span> {p.recent_disruption}</div>
              <div className="text-xs text-violet-300 mt-1 italic">→ ask interviewer: &quot;{p.diagnostic_q_for_interviewer}&quot;</div>
            </div>
          )) : (
            <div className="text-sm text-zinc-500">Industry primers not yet curated for this track.</div>
          )}
          {track === 'pm' && PM_APP_KPIS.length > 0 && (
            <div className="rounded border border-zinc-800 p-4 mt-4">
              <h3 className="font-medium text-emerald-300 mb-2">App-specific KPIs (memorize these)</h3>
              <ul className="text-xs space-y-2">
                {PM_APP_KPIS.map((a) => (
                  <li key={a.app}>
                    <span className="font-medium text-zinc-100">{a.app}</span>
                    <span className="text-zinc-500"> · {a.sector}</span>
                    <div className="text-zinc-400 mt-0.5">key: {a.key_metrics.join(', ')}</div>
                    <div className="text-zinc-400">NSM: <span className="text-emerald-300">{a.north_star}</span> · counter: <span className="text-rose-300">{a.counter}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
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

      {tab === '30 behavioral Qs' && <BehavioralThirty />}
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

function BehavioralThirty() {
  const [filter, setFilter] = useState<string>('all');
  const dims = ['all', ...Array.from(new Set(BEHAVIORAL_30.map((q) => q.dimension)))];
  const filtered = filter === 'all' ? BEHAVIORAL_30 : BEHAVIORAL_30.filter((q) => q.dimension === filter);

  return (
    <section className="space-y-4">
      <p className="text-sm text-zinc-400">The 30 most-asked behavioral questions across MBA tracks. Each has a STAR scaffold + spike move + common mistake.</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {dims.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`text-xs px-2 py-1 rounded ${filter === d ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            {d}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {filtered.map((q, i) => (
          <li key={i} className="rounded border border-zinc-800 p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-medium text-zinc-100 text-sm">{q.prompt}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 capitalize">{q.dimension}</span>
            </div>
            <div className="text-xs text-zinc-400 mb-2"><span className="text-emerald-400">STAR:</span> {q.star_scaffold}</div>
            <div className="text-xs text-violet-300 mb-1"><span className="text-violet-400">Spike:</span> {q.spike_move}</div>
            <div className="text-xs text-rose-300"><span className="text-rose-400">Common mistake:</span> {q.common_mistake}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
