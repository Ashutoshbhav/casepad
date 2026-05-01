'use client';

import { useState } from 'react';
import type { PreCaseCrammer } from '@/lib/groq/pre-case-crammer';

export function PreCaseCrammerPanel({ caseId, initial }: { caseId: string; initial: PreCaseCrammer | null }) {
  const [crammer, setCrammer] = useState<PreCaseCrammer | null>(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    if (crammer) { setOpen(true); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/crammer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      const data = await r.json();
      if (data?.crammer) setCrammer(data.crammer);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={reveal}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-emerald-900/40 text-emerald-300 rounded hover:bg-emerald-900/60 disabled:opacity-50"
      >
        {loading ? 'Researching…' : '⚡ Pre-case crammer (30 sec read)'}
      </button>
    );
  }

  if (!crammer) {
    return <div className="text-xs text-rose-400">Crammer unavailable.</div>;
  }

  return (
    <div className="absolute inset-x-4 top-16 z-30 max-h-[80vh] overflow-y-auto rounded-lg border border-emerald-700 bg-zinc-950 p-5 shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-sm font-semibold text-emerald-300">⚡ Pre-case crammer</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300">close ×</button>
      </div>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">Industry primer — {crammer.industry_primer.sector}</div>
        <div className="text-xs text-zinc-300 space-y-0.5">
          <div><span className="text-zinc-500">margins:</span> {crammer.industry_primer.typical_margins}</div>
          <div><span className="text-zinc-500">KPIs:</span> {(crammer.industry_primer.key_kpis || []).join(', ')}</div>
          <div><span className="text-zinc-500">disruption:</span> {crammer.industry_primer.recent_disruption}</div>
          <div><span className="text-zinc-500">top players:</span> {(crammer.industry_primer.top_players || []).join(', ')}</div>
        </div>
      </section>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">Likely frameworks for this case</div>
        <ul className="text-xs space-y-1">
          {(crammer.likely_frameworks || []).map((f, i) => (
            <li key={i}>
              <span className="text-emerald-300">{f.name}</span>
              <span className="text-zinc-500"> — {f.why_this_one}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">Math you&apos;ll likely need</div>
        <ul className="text-xs space-y-0.5">
          {(crammer.math_shortcuts || []).map((m, i) => (
            <li key={i}>
              <span className="text-amber-300">{m.name}</span>
              <span className="text-zinc-400"> · {m.formula}</span>
              {m.when ? <span className="text-zinc-500"> · {m.when}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">Watch-outs (your weak spots + case traps)</div>
        <ul className="text-xs text-rose-300 space-y-0.5">
          {(crammer.watch_outs || []).map((w, i) => <li key={i}>· {w}</li>)}
        </ul>
      </section>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">If you blank, say:</div>
        <div className="text-xs text-zinc-300 italic">&quot;{crammer.recovery_script}&quot;</div>
      </section>

      <section className="mb-4">
        <div className="text-xs uppercase text-zinc-500 mb-1">Spike phrase to land somewhere</div>
        <div className="text-xs text-violet-300 italic">&quot;{crammer.spike_phrase}&quot;</div>
      </section>

      {(crammer.sources || []).length > 0 && (
        <section>
          <div className="text-xs uppercase text-zinc-500 mb-1">Sources</div>
          <ol className="text-xs space-y-0.5">
            {crammer.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                  [{i + 1}] {s.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
