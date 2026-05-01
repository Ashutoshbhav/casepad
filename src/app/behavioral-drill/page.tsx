'use client';

import { useState } from 'react';
import { BEHAVIORAL_30 } from '@/lib/tracks-deep';

export const dynamic = 'force-dynamic';

// Behavioral drill — pick a question, type a STAR response, get LLM feedback
// against the rubric (clarity of S/T/A/R, specificity, self-awareness,
// dimension match, authenticity).

export default function BehavioralDrillPage() {
  const [filter, setFilter] = useState<string>('all');
  const dims = ['all', ...Array.from(new Set(BEHAVIORAL_30.map((q) => q.dimension)))];
  const filtered = filter === 'all' ? BEHAVIORAL_30 : BEHAVIORAL_30.filter((q) => q.dimension === filter);

  const [current, setCurrent] = useState<typeof BEHAVIORAL_30[number] | null>(null);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showScaffold, setShowScaffold] = useState(false);

  const pick = (q: typeof BEHAVIORAL_30[number]) => {
    setCurrent(q);
    setResponse('');
    setFeedback(null);
    setShowScaffold(false);
  };

  const submit = async () => {
    if (!current || response.trim().length < 50) return;
    setLoading(true);
    try {
      const r = await fetch('/api/behavioral-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: current, response }),
      });
      const data = await r.json();
      setFeedback(data.feedback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Behavioral drill</h1>
          <p className="text-xs text-zinc-500">Pick a question, type your STAR response, get rubric-aligned feedback.</p>
        </div>
        <a href="/cheatsheet" className="text-sm text-zinc-400 hover:text-zinc-200">← cheat sheet</a>
      </header>

      {!current && (
        <div>
          <div className="flex flex-wrap gap-1 mb-4">
            {dims.map((d) => (
              <button key={d} onClick={() => setFilter(d)} className={`text-xs px-2 py-1 rounded ${filter === d ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                {d}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {filtered.map((q, i) => (
              <li key={i}>
                <button onClick={() => pick(q)} className="w-full text-left rounded border border-zinc-800 hover:border-zinc-600 p-3">
                  <span className="text-zinc-100 text-sm">{q.prompt}</span>
                  <span className="text-xs text-zinc-500 ml-2">[{q.dimension}]</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {current && (
        <div>
          <button onClick={() => setCurrent(null)} className="text-xs text-zinc-500 mb-3 hover:text-zinc-300">← pick another</button>
          <div className="rounded border border-zinc-800 p-5 mb-4">
            <div className="text-xs uppercase text-emerald-300 mb-1">{current.dimension}</div>
            <h2 className="text-lg text-zinc-100 mb-2">{current.prompt}</h2>
            <button onClick={() => setShowScaffold(!showScaffold)} className="text-xs text-zinc-500 hover:text-zinc-300">
              {showScaffold ? '▾' : '▸'} STAR scaffold
            </button>
            {showScaffold && (
              <div className="mt-2 text-xs text-zinc-400 space-y-1">
                <div>• {current.star_scaffold}</div>
                <div className="text-violet-300">spike: {current.spike_move}</div>
                <div className="text-rose-300">avoid: {current.common_mistake}</div>
              </div>
            )}
          </div>

          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your STAR response... aim for 150-300 words, with specific details (numbers, names, outcomes)."
            className="w-full h-48 rounded bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-zinc-600"
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={submit} disabled={loading || response.trim().length < 50} className="rounded bg-white text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? 'Scoring…' : 'Get feedback'}
            </button>
            <span className="text-xs text-zinc-500">{response.trim().length} chars (min 50)</span>
          </div>

          {feedback && (
            <div className="mt-6 space-y-4">
              <div className="rounded border border-emerald-800 bg-emerald-950/20 p-4">
                <div className="text-emerald-300 text-sm font-semibold mb-2">Score: {feedback.total_score} / 100</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(feedback.dimensions || {}).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-zinc-400 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded border border-zinc-800 p-4">
                <div className="text-sm font-semibold text-zinc-300 mb-2">Strengths</div>
                <ul className="text-xs text-zinc-300 space-y-0.5">
                  {(feedback.strengths || []).map((s: string, i: number) => <li key={i}>· {s}</li>)}
                </ul>
              </div>
              <div className="rounded border border-zinc-800 p-4">
                <div className="text-sm font-semibold text-zinc-300 mb-2">Gaps</div>
                <ul className="text-xs text-rose-300 space-y-0.5">
                  {(feedback.gaps || []).map((g: string, i: number) => <li key={i}>· {g}</li>)}
                </ul>
              </div>
              {feedback.rewritten_excerpt && (
                <div className="rounded border border-violet-800 bg-violet-950/20 p-4">
                  <div className="text-sm font-semibold text-violet-300 mb-2">Suggested rewrite of weakest section</div>
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap">{feedback.rewritten_excerpt}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
