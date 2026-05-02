'use client';

import { useEffect, useRef, useState } from 'react';
import { TRACKS, type Track } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

// Recovery-drill mode — simulates the "blank-out moment" interviewers throw at
// candidates. Random curveballs (silent stretch, abrupt redirect, contradictory
// data) appear; student practices the recovery script. Score = how cleanly
// they pivot vs freeze.

type Curveball = { type: string; trigger: string; ideal_recovery: string };

const CURVEBALLS: Curveball[] = [
  { type: 'silent stretch', trigger: '… (interviewer says nothing for 25 seconds, just stares)', ideal_recovery: 'Restate the question, recap what you have so far, ask if the silence means you should pivot.' },
  { type: 'abrupt redirect', trigger: 'Wait — forget everything you just said. Tell me about a time you failed.', ideal_recovery: 'Acknowledge the redirect, take 5 seconds, deliver a STAR story with self-awareness.' },
  { type: 'contradictory data', trigger: 'Actually, the opposite is true: revenue is UP 15%, not down. What now?', ideal_recovery: 'Don\'t panic. Restate the new fact, ask what changed in your hypothesis, pivot the structure to fit the new reality.' },
  { type: 'pace pressure', trigger: 'You have 30 seconds left. Recommendation?', ideal_recovery: 'Bottom-line first: "Recommendation is X because Y, with Z risk." Don\'t apologize, don\'t hedge.' },
  { type: 'aggressive challenge', trigger: 'I disagree with your structure. Why didn\'t you consider [random framework]?', ideal_recovery: 'Don\'t cave reflexively. Acknowledge the alternative, articulate why you chose your structure, offer to add the framework if it adds value.' },
  { type: 'numbers blank', trigger: 'You forgot the multiplication. Try again — what\'s 47 × 38?', ideal_recovery: 'Buy time with rounding: ≈50 × 40 = 2000, then adjust: 47×38 ≈ 1786. Show your work, don\'t guess silently.' },
];

export default function DrillPage() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<Curveball | null>(null);
  const [history, setHistory] = useState<{ cb: Curveball; response: string; score: 'good' | 'ok' | 'freeze' }[]>([]);
  const [response, setResponse] = useState('');
  const [showIdeal, setShowIdeal] = useState(false);
  const startedAt = useRef<number>(0);

  const next = () => {
    const cb = CURVEBALLS[Math.floor(Math.random() * CURVEBALLS.length)];
    setCurrent(cb);
    setResponse('');
    setShowIdeal(false);
    startedAt.current = Date.now();
    setRunning(true);
  };

  const score = (label: 'good' | 'ok' | 'freeze') => {
    if (!current) return;
    setHistory((h) => [...h, { cb: current, response, score: label }]);
    setShowIdeal(true);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recovery drill</h1>
          <p className="text-xs text-zinc-500">Practice the moves that separate a 3 from a 4 — handling curveballs without freezing.</p>
        </div>
        <a href="/cheatsheet" className="text-sm text-zinc-400 hover:text-zinc-200">← cheat sheet</a>
      </header>

      {!running && history.length === 0 && (
        <div className="rounded border border-zinc-800 p-6">
          <h2 className="text-lg font-medium mb-2">How this works</h2>
          <p className="text-sm text-zinc-400 mb-4">
            6 curveball types: silent stretch, abrupt redirect, contradictory data, pace pressure,
            aggressive challenge, numbers blank. You get one at random. Type your recovery response in
            ≤45 seconds. Then self-rate vs the ideal recovery.
          </p>
          <button onClick={next} className="rounded bg-white text-zinc-900 px-4 py-2 text-sm font-medium">
            Start drill
          </button>
        </div>
      )}

      {running && current && (
        <div className="rounded border border-rose-700 p-6 mb-4 bg-rose-950/30">
          <div className="text-xs uppercase text-rose-300 mb-2">Curveball: {current.type}</div>
          <div className="text-zinc-100 mb-4 italic">&quot;{current.trigger}&quot;</div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your recovery response (or speak it aloud and pretend)…"
            className="w-full h-28 rounded bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-zinc-600"
            disabled={showIdeal}
          />
          {!showIdeal ? (
            <div className="mt-3 flex gap-2">
              <button onClick={() => score('good')} className="text-xs px-3 py-1.5 bg-emerald-900/40 text-emerald-300 rounded">Clean recovery ✓</button>
              <button onClick={() => score('ok')} className="text-xs px-3 py-1.5 bg-amber-900/40 text-amber-300 rounded">Wobbly</button>
              <button onClick={() => score('freeze')} className="text-xs px-3 py-1.5 bg-rose-900/40 text-rose-300 rounded">Froze</button>
            </div>
          ) : (
            <div className="mt-4 rounded bg-emerald-900/20 border border-emerald-800 p-3">
              <div className="text-xs uppercase text-emerald-300 mb-1">Ideal recovery</div>
              <div className="text-sm text-zinc-200">{current.ideal_recovery}</div>
              <button onClick={next} className="mt-3 text-xs px-3 py-1.5 bg-white text-zinc-900 rounded font-medium">Next curveball →</button>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Your drill log</h3>
          <ul className="space-y-1">
            {history.map((h, i) => (
              <li key={i} className="text-xs flex justify-between border-b border-zinc-900 py-1">
                <span className="text-zinc-400">{h.cb.type}</span>
                <span className={
                  h.score === 'good' ? 'text-emerald-300' :
                  h.score === 'ok' ? 'text-amber-300' : 'text-rose-300'
                }>{h.score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
