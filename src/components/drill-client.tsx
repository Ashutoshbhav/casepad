'use client';

import { useRef, useState } from 'react';

type Curveball = { type: string; trigger: string; ideal_recovery: string };

const CURVEBALLS: Curveball[] = [
  { type: 'silent stretch', trigger: '… (interviewer says nothing for 25 seconds, just stares)', ideal_recovery: 'Restate the question, recap what you have so far, ask if the silence means you should pivot.' },
  { type: 'abrupt redirect', trigger: 'Wait — forget everything you just said. Tell me about a time you failed.', ideal_recovery: 'Acknowledge the redirect, take 5 seconds, deliver a STAR story with self-awareness.' },
  { type: 'contradictory data', trigger: 'Actually, the opposite is true: revenue is UP 15%, not down. What now?', ideal_recovery: 'Don\'t panic. Restate the new fact, ask what changed in your hypothesis, pivot the structure to fit the new reality.' },
  { type: 'pace pressure', trigger: 'You have 30 seconds left. Recommendation?', ideal_recovery: 'Bottom-line first: "Recommendation is X because Y, with Z risk." Don\'t apologize, don\'t hedge.' },
  { type: 'aggressive challenge', trigger: 'I disagree with your structure. Why didn\'t you consider [random framework]?', ideal_recovery: 'Don\'t cave reflexively. Acknowledge the alternative, articulate why you chose your structure, offer to add the framework if it adds value.' },
  { type: 'numbers blank', trigger: 'You forgot the multiplication. Try again — what\'s 47 × 38?', ideal_recovery: 'Buy time with rounding: ≈50 × 40 = 2000, then adjust: 47×38 ≈ 1786. Show your work, don\'t guess silently.' },
];

export function DrillClient() {
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

  const primaryBtn: React.CSSProperties = {
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
    display: 'inline-block',
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg-canvas)' }}>
      {/* HERO BAND — sage to match the recovery card on /drills index */}
      <section
        className="px-6 sm:px-12 py-12"
        style={{ background: '#7a8f92', color: '#FFFFFF' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-baseline justify-between mb-3">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
              Drill 03 · Recovery
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
            Don&apos;t freeze
          </h1>
          <p
            className="mt-6"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              lineHeight: 1.55,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '60ch',
            }}
          >
            Curveballs interviewers throw — silent stretch, contradictory
            data, abrupt redirect. Practice the moves that separate a 3
            from a 4.
          </p>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-3xl mx-auto">
        {!running && history.length === 0 && (
          <div className="p-6" style={{ border: '1px solid var(--color-border)' }}>
            <span className="hupr-mono-eyebrow">How this works</span>
            <hr className="hupr-hairline mb-3" />
            <p
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                margin: 0,
                marginBottom: 16,
              }}
            >
              6 curveball types: silent stretch, abrupt redirect, contradictory
              data, pace pressure, aggressive challenge, numbers blank. You get
              one at random. Type your recovery response in ≤45 seconds. Then
              self-rate vs the ideal recovery.
            </p>
            <button onClick={next} className="hupr-anim-btn" style={primaryBtn}>
              <span className="top">Start drill →</span>
              <span className="btm">Start drill →</span>
            </button>
          </div>
        )}

        {running && current && (
          <div
            className="p-6 mb-4"
            style={{ border: '2px solid #a64b52', background: 'var(--color-bg-canvas)' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#a64b52',
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              Curveball · {current.type}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1.2,
                color: 'var(--color-text-primary)',
                marginBottom: 16,
              }}
            >
              &ldquo;{current.trigger}&rdquo;
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your recovery response (or speak it aloud and pretend)…"
              disabled={showIdeal}
              style={{
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                padding: '14px',
                borderRadius: 4,
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                width: '100%',
                outline: 'none',
                minHeight: 120,
                resize: 'vertical',
              }}
            />
            {!showIdeal ? (
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => score('good')}
                  style={{
                    background: '#7a8f92',
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: 4,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Clean recovery ✓
                </button>
                <button
                  onClick={() => score('ok')}
                  style={{
                    background: '#c2876d',
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: 4,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Wobbly
                </button>
                <button
                  onClick={() => score('freeze')}
                  style={{
                    background: '#a64b52',
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: 4,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Froze
                </button>
              </div>
            ) : (
              <div
                className="mt-5 p-4"
                style={{ background: 'var(--hupr-cream)', border: '1px solid var(--color-border)' }}
              >
                <span className="hupr-mono-eyebrow">Ideal recovery</span>
                <hr className="hupr-hairline mb-3" />
                <p
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    marginBottom: 16,
                  }}
                >
                  {current.ideal_recovery}
                </p>
                <button onClick={next} className="hupr-anim-btn" style={primaryBtn}>
                  <span className="top">Next curveball →</span>
                  <span className="btm">Next curveball →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <section className="mt-8">
            <span className="hupr-mono-eyebrow">Your drill log</span>
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>{h.cb.type}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        h.score === 'good'
                          ? '#7a8f92'
                          : h.score === 'ok'
                            ? '#c2876d'
                            : '#a64b52',
                    }}
                  >
                    {h.score}
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
