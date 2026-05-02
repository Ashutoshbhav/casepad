'use client';

import { useState } from 'react';
import type { PreCaseCrammer } from '@/lib/groq/pre-case-crammer';

// Pre-read industry primer — same data model as the old in-solve "crammer",
// but positioned on /cases (i.e., BEFORE you walk into the room). Mirrors
// what real candidates do: skim the industry / company before the interview.
// Inside /solve, none of this is shown — that page is in-room.

export function IndustryPrimerButton({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [crammer, setCrammer] = useState<PreCaseCrammer | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (crammer) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/crammer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      const data = await r.json();
      if (data?.crammer) setCrammer(data.crammer);
      else setErr(data?.error || 'unknown error');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={click}
        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        title="Read industry context before you solve"
      >
        {loading ? '…' : '📚 primer'}
      </button>

      {open && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-lg border border-emerald-700 bg-zinc-950 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-sm font-semibold text-emerald-300">📚 Industry primer</h2>
              <button onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300">close ×</button>
            </div>
            <div className="text-[11px] text-zinc-500 mb-4 italic">
              Read this BEFORE you start the case (real candidates Google industry context beforehand). Once you click into /solve it&apos;s in-room only.
            </div>

            {loading && <div className="text-xs text-zinc-400">Researching the industry…</div>}

            {err && !loading && (
              <div className="text-xs text-rose-300">
                Couldn&apos;t load primer: {err}
                <button
                  onClick={(e) => { e.preventDefault(); setCrammer(null); setErr(null); click(e); }}
                  className="ml-2 px-2 py-0.5 bg-zinc-800 rounded text-zinc-300"
                >
                  retry
                </button>
              </div>
            )}

            {crammer && !loading && (
              <div className="space-y-4 text-zinc-200">
                {(crammer as any).fallback_used && (
                  <div className="rounded border border-amber-800 bg-amber-950/30 p-2 text-[11px] text-amber-200">
                    ⚠ Industry research service is offline — showing a generic primer based on your track. Try again in a minute for the full Tavily-grounded version.
                  </div>
                )}
                <section>
                  <div className="text-xs uppercase text-zinc-500 mb-1">Industry — {crammer.industry_primer.sector}</div>
                  <div className="text-xs space-y-0.5">
                    <div><span className="text-zinc-500">margins:</span> {crammer.industry_primer.typical_margins}</div>
                    <div><span className="text-zinc-500">KPIs:</span> {(crammer.industry_primer.key_kpis || []).join(', ')}</div>
                    <div><span className="text-zinc-500">disruption:</span> {crammer.industry_primer.recent_disruption}</div>
                    <div><span className="text-zinc-500">top players:</span> {(crammer.industry_primer.top_players || []).join(', ')}</div>
                  </div>
                </section>
                <section>
                  <div className="text-xs uppercase text-zinc-500 mb-1">Likely frameworks for this case</div>
                  <ul className="text-xs space-y-1">
                    {(crammer.likely_frameworks || []).map((f, i) => (
                      <li key={i}><span className="text-emerald-300">{f.name}</span> <span className="text-zinc-500">— {f.why_this_one}</span></li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="text-xs uppercase text-zinc-500 mb-1">Math you&apos;ll likely need</div>
                  <ul className="text-xs space-y-0.5">
                    {(crammer.math_shortcuts || []).map((m, i) => (
                      <li key={i}><span className="text-amber-300">{m.name}</span> · <span className="text-zinc-400">{m.formula}</span> {m.when ? <span className="text-zinc-500">· {m.when}</span> : null}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="text-xs uppercase text-zinc-500 mb-1">Watch-outs</div>
                  <ul className="text-xs text-rose-300 space-y-0.5">
                    {(crammer.watch_outs || []).map((w, i) => <li key={i}>· {w}</li>)}
                  </ul>
                </section>
                {(crammer.sources || []).length > 0 && (
                  <section>
                    <div className="text-xs uppercase text-zinc-500 mb-1">Sources</div>
                    <ol className="text-xs space-y-0.5">
                      {crammer.sources.map((s, i) => (
                        <li key={i}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">[{i + 1}] {s.title}</a>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
