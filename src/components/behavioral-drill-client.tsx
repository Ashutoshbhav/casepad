'use client';

import { useState } from 'react';
import { BEHAVIORAL_30 } from '@/lib/tracks-deep';
import { BEHAVIORAL_IDEAL_ANSWERS } from '@/lib/behavioral-ideal-answers';

export function BehavioralDrillClient() {
  const [filter, setFilter] = useState<string>('all');
  const dims = ['all', ...Array.from(new Set(BEHAVIORAL_30.map((q) => q.dimension)))];
  const filtered = filter === 'all' ? BEHAVIORAL_30 : BEHAVIORAL_30.filter((q) => q.dimension === filter);

  const [current, setCurrent] = useState<typeof BEHAVIORAL_30[number] | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showScaffold, setShowScaffold] = useState(false);
  const [showIdeal, setShowIdeal] = useState(false);

  const pick = (q: typeof BEHAVIORAL_30[number], idx: number) => {
    setCurrent(q);
    setCurrentIdx(idx);
    setResponse('');
    setFeedback(null);
    setShowScaffold(false);
    setShowIdeal(false);
  };

  const ideal = currentIdx !== null
    ? BEHAVIORAL_IDEAL_ANSWERS.find((a) => a.question_index === currentIdx + 1)
    : null;

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

  const ebInputStyle: React.CSSProperties = {
    background: 'var(--color-bg-sunken)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    padding: '14px',
    borderRadius: 4,
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    resize: 'vertical' as const,
  };

  const ebButtonPrimary: React.CSSProperties = {
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
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg-canvas)' }}>
      {/* HERO BAND — terra to match the behavioral card on /drills index */}
      <section
        className="px-6 sm:px-12 py-12"
        style={{ background: '#a64b52', color: '#FFFFFF' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-baseline justify-between mb-3">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
              Drill 02 · Behavioral
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
              maxWidth: '24ch',
            }}
          >
            Tell me about a time
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
            Pick a question, type your STAR response, get rubric-aligned
            feedback across 6 dimensions plus an ideal-answer reference.
          </p>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-4xl mx-auto">
        {!current && (
          <>
            <div className="mb-6">
              <span className="hupr-mono-eyebrow">Filter by dimension</span>
              <hr className="hupr-hairline mb-3" />
              <div className="flex flex-wrap gap-2">
                {dims.map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilter(d)}
                    style={{
                      background: filter === d ? 'var(--color-text-primary)' : 'transparent',
                      color: filter === d ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
                      border: '1px solid',
                      borderColor: filter === d ? 'var(--color-text-primary)' : 'var(--color-border)',
                      padding: '8px 14px',
                      borderRadius: 4,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      fontWeight: filter === d ? 700 : 400,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="hupr-mono-eyebrow">Questions ({filtered.length})</span>
              <hr className="hupr-hairline mb-3" />
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {filtered.map((q) => {
                  const originalIdx = BEHAVIORAL_30.indexOf(q);
                  return (
                    <li key={originalIdx}>
                      <button
                        onClick={() => pick(q, originalIdx)}
                        className="w-full text-left transition-opacity hover:opacity-90"
                        style={{
                          background: 'transparent',
                          border: 0,
                          borderBottom: '1px solid var(--color-border)',
                          padding: '16px 0',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-headline)',
                            fontWeight: 700,
                            fontSize: 16,
                            color: 'var(--color-text-primary)',
                            marginBottom: 4,
                          }}
                        >
                          {q.prompt}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {q.dimension}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {current && (
          <div>
            <button
              onClick={() => setCurrent(null)}
              className="hupr-mono-eyebrow underline"
              style={{
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              ← pick another
            </button>
            <div className="p-6 mb-6" style={{ border: '1px solid var(--color-border)' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                }}
              >
                {current.dimension}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1.2,
                  color: 'var(--color-text-primary)',
                  marginBottom: 16,
                }}
              >
                {current.prompt}
              </h2>
              <div className="flex gap-4 items-center flex-wrap">
                <button
                  onClick={() => setShowScaffold(!showScaffold)}
                  className="hupr-mono-eyebrow underline"
                  style={{
                    color: 'var(--color-text-secondary)',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  {showScaffold ? '▾' : '▸'} STAR scaffold
                </button>
                {ideal && (
                  <button
                    onClick={() => setShowIdeal(!showIdeal)}
                    className="hupr-mono-eyebrow underline"
                    style={{
                      color: 'var(--color-text-primary)',
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {showIdeal ? '▾' : '▸'} See ideal answer (90+)
                  </button>
                )}
              </div>
              {showScaffold && (
                <div className="mt-3" style={{ fontFamily: 'var(--font-accent)', fontSize: 14, lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--color-text-primary)' }}>· {current.star_scaffold}</div>
                  <div style={{ color: '#7a8f92', marginTop: 4 }}>spike: {current.spike_move}</div>
                  <div style={{ color: '#a64b52', marginTop: 4 }}>avoid: {current.common_mistake}</div>
                </div>
              )}
              {showIdeal && ideal && (
                <div
                  className="mt-4 p-4"
                  style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border)' }}
                >
                  <div className="hupr-mono-eyebrow mb-2">Ideal answer (~150 words, scores 90+)</div>
                  <hr className="hupr-hairline mb-3" />
                  <div
                    style={{
                      fontFamily: 'var(--font-accent)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'pre-wrap',
                      marginBottom: 12,
                    }}
                  >
                    {ideal.ideal_answer}
                  </div>
                  <div className="hupr-mono-eyebrow mb-2">Why it scores 90+</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {ideal.why_it_scores_90.map((r, i) => (
                      <li
                        key={i}
                        style={{
                          fontFamily: 'var(--font-accent)',
                          fontSize: 13,
                          color: 'var(--color-text-primary)',
                          padding: '3px 0',
                        }}
                      >
                        · {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your STAR response... aim for 150-300 words, with specific details (numbers, names, outcomes)."
              style={{ ...ebInputStyle, minHeight: 200 }}
            />
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button
                onClick={submit}
                disabled={loading || response.trim().length < 50}
                className="hupr-anim-btn"
                style={{
                  ...ebButtonPrimary,
                  opacity: loading || response.trim().length < 50 ? 0.5 : 1,
                }}
              >
                <span className="top">{loading ? 'Scoring…' : 'Get feedback'}</span>
                <span className="btm">{loading ? 'Scoring…' : 'Get feedback'}</span>
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-muted)',
                }}
              >
                {response.trim().length} chars (min 50)
              </span>
            </div>

            {feedback && (
              <div className="mt-8 space-y-6">
                <div className="p-5" style={{ background: 'var(--hupr-cream)', border: '1px solid var(--color-border)' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-headline)',
                      fontWeight: 700,
                      fontSize: 36,
                      color: 'var(--color-text-primary)',
                      marginBottom: 8,
                    }}
                  >
                    {feedback.total_score} / 100
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                    {Object.entries(feedback.dimensions || {}).map(([k, v]: any) => (
                      <div
                        key={k}
                        className="flex justify-between"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span>{k.replace(/_/g, ' ')}</span>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5" style={{ border: '1px solid var(--color-border)' }}>
                  <span className="hupr-mono-eyebrow">Strengths</span>
                  <hr className="hupr-hairline mb-3" />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(feedback.strengths || []).map((s: string, i: number) => (
                      <li
                        key={i}
                        style={{
                          fontFamily: 'var(--font-accent)',
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: 'var(--color-text-primary)',
                          padding: '4px 0',
                        }}
                      >
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5" style={{ border: '1px solid var(--color-border)' }}>
                  <span className="hupr-mono-eyebrow">Gaps</span>
                  <hr className="hupr-hairline mb-3" />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(feedback.gaps || []).map((g: string, i: number) => (
                      <li
                        key={i}
                        style={{
                          fontFamily: 'var(--font-accent)',
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: '#a64b52',
                          padding: '4px 0',
                        }}
                      >
                        · {g}
                      </li>
                    ))}
                  </ul>
                </div>
                {feedback.rewritten_excerpt && (
                  <div className="p-5" style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border)' }}>
                    <span className="hupr-mono-eyebrow">Suggested rewrite of weakest section</span>
                    <hr className="hupr-hairline mb-3" />
                    <div
                      style={{
                        fontFamily: 'var(--font-accent)',
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {feedback.rewritten_excerpt}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
