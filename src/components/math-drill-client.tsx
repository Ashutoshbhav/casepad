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

  const accuracyPct =
    score.total > 0 ? Math.round((100 * score.correct) / score.total) : null;

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* HERO BAND — sand to match the math card on /drills index */}
      <section
        className="px-6 sm:px-12 py-12"
        style={{ background: '#a69385', color: '#FFFFFF' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-baseline justify-between mb-3">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
              Drill 01 · Math
            </span>
            <a
              href="/drills"
              className="hupr-mono-eyebrow underline"
              style={{ color: '#FFFFFF' }}
            >
              ← back to drills
            </a>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0' }} />
          <h1
            className="uppercase mt-6"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 72px)',
              lineHeight: 1,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '20ch',
            }}
          >
            Math under pressure
          </h1>
          {score.total > 0 && (
            <div
              className="mt-6 flex items-baseline gap-4"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-headline)' }}>
                {score.correct}/{score.total}
              </span>
              {accuracyPct !== null && (
                <span style={{ opacity: 0.9 }}>{accuracyPct}% accuracy</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CONTROLS + DRILL PANEL */}
      <div className="px-6 sm:px-12 py-12 max-w-3xl mx-auto">
        {/* Track + Level controls */}
        <div className="mb-8">
          <span className="hupr-mono-eyebrow">Setup</span>
          <hr className="hupr-hairline mb-4" />
          <div className="flex gap-3 items-center flex-wrap">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
              }}
            >
              Track:
            </span>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as Track)}
              style={{
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            >
              {TRACK_LIST.filter(t => t !== 'behavioral').map(t => (
                <option key={t} value={t}>{TRACKS[t].short}</option>
              ))}
            </select>
            <span
              className="ml-2"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
              }}
            >
              Level:
            </span>
            {[1, 2, 3, 4].map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l as 1|2|3|4); setCurrent(null); }}
                style={{
                  background: level === l ? 'var(--color-text-primary)' : 'transparent',
                  color: level === l ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: level === l ? 'var(--color-text-primary)' : 'var(--color-border)',
                  padding: '8px 14px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  fontWeight: level === l ? 700 : 400,
                }}
              >
                L{l}
              </button>
            ))}
          </div>
        </div>

        {!current && (
          <button
            onClick={next}
            className="hupr-anim-btn"
            style={{
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg-canvas)',
              padding: '14px 22px',
              borderRadius: 6,
              border: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'inline-block',
            }}
          >
            <span className="top">Start drilling →</span>
            <span className="btm">Start drilling →</span>
          </button>
        )}

        {current && (
          <div
            className="p-8"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-canvas)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                marginBottom: 12,
              }}
            >
              {current.topic} · Level {current.level}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 28,
                lineHeight: 1.2,
                color: 'var(--color-text-primary)',
                marginBottom: 24,
              }}
            >
              {current.question}
            </div>
            {!result && (
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  step="0.01"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="your answer"
                  autoFocus
                  style={{
                    background: 'var(--color-bg-sunken)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '12px 14px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    width: 140,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={submit}
                  className="hupr-anim-btn"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-canvas)',
                    padding: '12px 20px',
                    borderRadius: 6,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span className="top">Check</span>
                  <span className="btm">Check</span>
                </button>
              </div>
            )}
            {result === 'correct' && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#7a8f92',
                    marginBottom: 12,
                  }}
                >
                  ✓ Correct
                </div>
                {current.explanation && (
                  <div
                    style={{
                      fontFamily: 'var(--font-accent)',
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                      marginBottom: 16,
                    }}
                  >
                    ↳ {current.explanation}
                  </div>
                )}
                <button
                  onClick={next}
                  className="hupr-anim-btn"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-canvas)',
                    padding: '10px 18px',
                    borderRadius: 6,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span className="top">Next →</span>
                  <span className="btm">Next →</span>
                </button>
              </div>
            )}
            {result === 'wrong' && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#a64b52',
                    marginBottom: 12,
                  }}
                >
                  ✗ Answer was {current.answer}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-muted)',
                    marginBottom: 8,
                  }}
                >
                  Within tolerance ±{current.tolerance}
                </div>
                {current.explanation && (
                  <div
                    style={{
                      fontFamily: 'var(--font-accent)',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>shortcut: </span>
                    {current.explanation}
                  </div>
                )}
                {current.common_trap && (
                  <div
                    style={{
                      fontFamily: 'var(--font-accent)',
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>common trap: </span>
                    {current.common_trap}
                  </div>
                )}
                <button
                  onClick={next}
                  className="hupr-anim-btn mt-3"
                  style={{
                    background: 'var(--color-text-primary)',
                    color: 'var(--color-bg-canvas)',
                    padding: '10px 18px',
                    borderRadius: 6,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span className="top">Next →</span>
                  <span className="btm">Next →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-12">
            <span className="hupr-mono-eyebrow">Last 10</span>
            <hr className="hupr-hairline mb-3" />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex justify-between py-2"
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {h.q.topic} L{h.q.level}: {h.q.question.slice(0, 50)}
                  </span>
                  <span style={{ color: h.correct ? '#7a8f92' : '#a64b52', fontWeight: 700 }}>
                    {h.correct ? '✓' : '✗'} ({h.user})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
