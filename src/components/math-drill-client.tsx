'use client';

import { useState, useMemo } from 'react';
import { TRACKS, TRACK_LIST, type Track } from '@/lib/tracks';
import { MATH_DRILL_POOL } from '@/lib/math-drill-pool';

type Q = { question: string; answer: number; tolerance: number; topic: string; level: 1|2|3|4; explanation?: string; common_trap?: string };

const LEGACY_QUESTIONS: Q[] = [
  { level: 1, topic: 'Percentage', question: '12% of 350 = ?', answer: 42, tolerance: 1 },
  { level: 1, topic: 'Percentage', question: '7% of 800 = ?', answer: 56, tolerance: 1 },
  { level: 1, topic: 'Growth rate', question: 'Revenue went 80 → 100. Growth %?', answer: 25, tolerance: 0 },
  { level: 1, topic: 'Growth rate', question: 'EBITDA fell 60 → 45. % decline?', answer: 25, tolerance: 1 },
  { level: 1, topic: 'Multiplication', question: '47 × 38 = ? (estimate within 100)', answer: 1786, tolerance: 100 },
  { level: 1, topic: 'Multiplication', question: '23 × 17 = ?', answer: 391, tolerance: 5 },
  { level: 1, topic: 'Division', question: '4500 / 35 = ? (round to nearest)', answer: 129, tolerance: 5 },
  { level: 2, topic: 'CAGR', question: '$100 → $200 in 9 yr. CAGR %?', answer: 8, tolerance: 1 },
  { level: 2, topic: 'CAGR', question: '$50 → $150 in 5 yr. CAGR %?', answer: 25, tolerance: 2 },
  { level: 2, topic: 'Breakeven', question: 'FC=$1M, P=$100, VC=$60. Breakeven units?', answer: 25000, tolerance: 500 },
  { level: 2, topic: 'Contribution margin', question: 'Price=$200, VC=$140. CM%?', answer: 30, tolerance: 1 },
  { level: 2, topic: 'Payback', question: 'Invest $10M, $2.5M/yr cash. Payback (yr)?', answer: 4, tolerance: 0.5 },
  { level: 2, topic: 'Market sizing', question: 'India 1.4B × 8% adopters × 100 cups/yr × ₹100. Market size in ₹Cr?', answer: 11200, tolerance: 1000 },
  { level: 3, topic: 'NPV', question: '$2M/yr for 5yr at 10% discount. PV (in millions)?', answer: 7.6, tolerance: 0.5 },
  { level: 3, topic: 'WACC', question: '70% E at 12%, 30% D at 6% (tax 30%). WACC%?', answer: 9.66, tolerance: 0.5 },
  { level: 3, topic: 'Terminal value', question: 'FCF=$10M, g=3%, WACC=11%. TV?', answer: 128.75, tolerance: 5 },
  { level: 3, topic: 'Price elasticity', question: 'Price up 10%, qty down 15%. Elasticity?', answer: -1.5, tolerance: 0.1 },
  { level: 4, topic: 'IRR (paper)', question: '$300M → $1.2B in 5yr. IRR%?', answer: 32, tolerance: 2 },
  { level: 4, topic: 'MOIC', question: 'Entry $300M, exit $900M. MOIC?', answer: 3, tolerance: 0.1 },
  { level: 4, topic: 'EV bridge', question: 'Equity $500M, debt $200M, cash $50M. EV?', answer: 650, tolerance: 5 },
  { level: 4, topic: 'Tax shield NPV', question: '$1B perpetual debt × 25% tax. NPV of tax shield ($M)?', answer: 250, tolerance: 5 },
];

export function MathDrillClient() {
  const [track, setTrack] = useState<Track>('consulting');
  const [level, setLevel] = useState<1|2|3|4>(1);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [current, setCurrent] = useState<Q | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct'|'wrong'|null>(null);
  const [history, setHistory] = useState<{ q: Q; user: number | null; correct: boolean }[]>([]);

  const pool = useMemo(() => {
    const filtered = MATH_DRILL_POOL.filter((q) => q.level === level && (q.track === track || q.track === 'all'));
    return filtered.length > 0 ? filtered : LEGACY_QUESTIONS.filter(q => q.level === level);
  }, [level, track]);

  const next = () => {
    const q = pool[Math.floor(Math.random() * pool.length)] as Q;
    setCurrent(q);
    setAnswer('');
    setResult(null);
  };

  const submit = () => {
    if (!current) return;
    const userVal = parseFloat(answer);
    if (isNaN(userVal)) return;
    const ok = Math.abs(userVal - current.answer) <= current.tolerance;
    setResult(ok ? 'correct' : 'wrong');
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    setHistory((h) => [{ q: current, user: userVal, correct: ok }, ...h.slice(0, 9)]);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Math drill engine</h1>
          <p className="text-xs text-zinc-500">Practice mental math under interview pressure. Score: {score.correct}/{score.total} {score.total > 0 && `(${Math.round(100*score.correct/score.total)}%)`}</p>
        </div>
        <a href="/cheatsheet" className="text-sm text-zinc-400 hover:text-zinc-200">← cheat sheet</a>
      </header>

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <span className="text-xs text-zinc-500">Track:</span>
        <select value={track} onChange={(e) => setTrack(e.target.value as Track)} className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
          {TRACK_LIST.filter(t => t !== 'behavioral').map(t => <option key={t} value={t}>{TRACKS[t].short}</option>)}
        </select>
        <span className="text-xs text-zinc-500 ml-3">Level:</span>
        {[1,2,3,4].map(l => (
          <button key={l} onClick={() => { setLevel(l as 1|2|3|4); setCurrent(null); }} className={`text-xs px-2 py-1 rounded ${level === l ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
            L{l}
          </button>
        ))}
      </div>

      {!current && (
        <button onClick={next} className="rounded bg-white text-zinc-900 px-4 py-2 text-sm font-medium">Start drilling →</button>
      )}

      {current && (
        <div className="rounded border border-zinc-800 p-6">
          <div className="text-xs uppercase text-zinc-500 mb-2">{current.topic} · Level {current.level}</div>
          <div className="text-lg text-zinc-100 mb-4">{current.question}</div>
          {!result && (
            <>
              <input type="number" step="0.01" value={answer} onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="your answer" autoFocus
                className="w-32 rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-zinc-600" />
              <button onClick={submit} className="ml-2 rounded bg-emerald-700 text-white px-4 py-2 text-sm">Check</button>
            </>
          )}
          {result === 'correct' && (
            <div>
              <div className="text-emerald-300 font-medium mb-2">✓ Correct</div>
              {current.explanation && <div className="text-xs text-zinc-400 mb-3 italic">↳ {current.explanation}</div>}
              <button onClick={next} className="rounded bg-white text-zinc-900 px-3 py-1.5 text-sm">Next →</button>
            </div>
          )}
          {result === 'wrong' && (
            <div>
              <div className="text-rose-300 font-medium mb-2">✗ Answer was {current.answer}</div>
              <div className="text-xs text-zinc-400 mb-1">Within tolerance ±{current.tolerance}</div>
              {current.explanation && <div className="text-xs text-emerald-300 mt-2"><span className="text-zinc-500">shortcut: </span>{current.explanation}</div>}
              {current.common_trap && <div className="text-xs text-amber-300 mt-1"><span className="text-zinc-500">common trap: </span>{current.common_trap}</div>}
              <button onClick={next} className="rounded bg-white text-zinc-900 px-3 py-1.5 text-sm mt-3">Next →</button>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Last 10</h3>
          <ul className="space-y-1 text-xs">
            {history.map((h, i) => (
              <li key={i} className="flex justify-between border-b border-zinc-900 py-1">
                <span className="text-zinc-400">{h.q.topic} L{h.q.level}: {h.q.question.slice(0, 50)}</span>
                <span className={h.correct ? 'text-emerald-300' : 'text-rose-300'}>{h.correct ? '✓' : '✗'} ({h.user})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
