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

// Tab → HUPR section accent. Each tab has its own colored hero band so
// switching feels like moving between rooms.
const TAB_BG: Record<Tab, string> = {
  'Weakness focus':   'var(--hupr-cognac)',
  'Frameworks':       'var(--hupr-sand)',
  'Math drills':      'var(--hupr-terra)',
  'Industry primers': 'var(--hupr-sage)',
  'Recovery':         'var(--hupr-cream)',
  'Spike Phrases':    'var(--hupr-slate)',
  '30 behavioral Qs': 'var(--hupr-cognac)',
  'Ask anything':     'var(--hupr-sage)',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-canvas)',
  padding: '20px',
  marginBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontWeight: 700,
  fontSize: 18,
  color: 'var(--color-text-primary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '-0.005em',
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
};

const proseStyle: React.CSSProperties = {
  fontFamily: 'var(--font-accent)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'var(--color-text-primary)',
};

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

  const isLightBg = TAB_BG[tab] === 'var(--hupr-cream)';
  const heroFg = isLightBg ? '#323234' : '#FFFFFF';

  return (
    <div>
      {/* TAB NAV — sticky pill row (matches /cases track pills). */}
      <nav
        className="sticky top-0 z-10"
        style={{
          background: 'var(--color-bg-canvas)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 0,
        }}
      >
        <div className="flex gap-2 overflow-x-auto py-3">
          {TABS.map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: isActive ? 'var(--color-text-primary)' : 'transparent',
                  color: isActive ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--color-text-primary)' : 'var(--color-border)',
                  padding: '8px 14px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </nav>

      {/* HERO BAND for the active tab */}
      <section
        className="-mx-6 sm:-mx-12 px-6 sm:px-12 py-12"
        style={{ background: TAB_BG[tab], color: heroFg }}
      >
        <span
          className="hupr-mono-eyebrow"
          style={{ color: heroFg, opacity: 0.85 }}
        >
          Module · {tab}
        </span>
        <hr
          style={{
            border: 0,
            borderTop: `1px solid ${isLightBg ? '#323234' : 'rgba(255,255,255,0.4)'}`,
            margin: '8px 0 20px',
          }}
        />
        <h2
          className="uppercase"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 64px)',
            lineHeight: 1,
            color: heroFg,
            margin: 0,
            maxWidth: '24ch',
          }}
        >
          {tab}
        </h2>
      </section>

      <div className="py-10">
        {tab === 'Weakness focus' && (
          <section>
            <p style={{ ...proseStyle, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
              Sorted by your lowest performance across last {weakestStats.length || 0} sessions. Drill the top item first.
            </p>
            {weakestStats.length === 0 ? (
              <div style={cardStyle}>
                <p style={proseStyle}>
                  No completed cases yet. Complete 1–2 cases to populate this.
                </p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {weakestStats.map((s, i) => (
                  <li key={s.dim} style={cardStyle}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={titleStyle}>{s.dim.replace(/_/g, ' ')}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '4px 10px',
                          background: s.ratio < 0.6 ? '#a64b52' : s.ratio < 0.75 ? '#c2876d' : '#7a8f92',
                          color: '#FFFFFF',
                          borderRadius: 3,
                        }}
                      >
                        {(s.ratio * 100).toFixed(0)}% of weight
                      </span>
                    </div>
                    <div style={metaStyle}>avg {s.avg.toFixed(1)} of {s.weight} max</div>
                    {i === 0 && s.ratio < 0.7 && (
                      <div style={{ ...metaStyle, color: '#a64b52', marginTop: 8, fontWeight: 700 }}>
                        ⚠ Priority focus
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'Frameworks' && (
          <section>
            {(frameworksFor(track).length ? frameworksFor(track) : def.frameworks.map(f => ({ name: f.name, when_to_use: f.when_to_use, when_NOT_to_use: '', structure: f.structure, example: '' }))).map((f: any) => (
              <div key={f.name} style={cardStyle}>
                <h3 style={titleStyle}>{f.name}</h3>
                <div style={{ ...metaStyle, marginTop: 6 }}>
                  WHEN: <span style={{ color: 'var(--color-text-primary)', textTransform: 'none', letterSpacing: 0 }}>{f.when_to_use}</span>
                </div>
                {f.when_NOT_to_use && (
                  <div style={{ ...metaStyle, marginTop: 4, color: '#a64b52' }}>
                    NOT WHEN: <span style={{ color: 'var(--color-text-primary)', textTransform: 'none', letterSpacing: 0 }}>{f.when_NOT_to_use}</span>
                  </div>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
                  {f.structure.map((s: string, i: number) => (
                    <li key={i} style={{ ...proseStyle, padding: '3px 0' }}>· {s}</li>
                  ))}
                </ul>
                {f.example && (
                  <div style={{ ...proseStyle, marginTop: 10, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                    e.g. {f.example}
                  </div>
                )}
                <CohortNotes scope="framework" scope_id={`${track}:${f.name}`} />
              </div>
            ))}
          </section>
        )}

        {tab === 'Math drills' && (
          <section>
            {[1, 2, 3, 4].map((level) => {
              const drills = (mathFor(track).length ? mathFor(track) : def.math.map(m => ({ level: 1 as const, name: m.name, formula: m.formula, shortcut: m.mnemonic || '', example: '', threshold_to_advance: '' }))).filter((d: any) => d.level === level);
              if (drills.length === 0) return null;
              const levelTone = ['#7a8f92', '#a69385', '#c2876d', '#a64b52'][level - 1];
              return (
                <div key={level} style={{ ...cardStyle, borderLeft: `4px solid ${levelTone}` }}>
                  <h3 style={{ ...titleStyle, color: levelTone }}>
                    Level {level}{' '}
                    <span style={{ ...metaStyle, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      ({level === 1 ? 'beginner' : level === 2 ? 'core' : level === 3 ? 'advanced' : 'expert'})
                    </span>
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                    {drills.map((d: any) => (
                      <li
                        key={d.name}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <span
                            style={{
                              fontFamily: 'var(--font-headline)',
                              fontWeight: 700,
                              fontSize: 14,
                              color: 'var(--color-text-primary)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {d.name}
                          </span>
                          <code
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              color: 'var(--color-text-secondary)',
                              background: 'var(--color-bg-sunken)',
                              padding: '2px 8px',
                              borderRadius: 3,
                            }}
                          >
                            {d.formula}
                          </code>
                        </div>
                        {d.shortcut && (
                          <div style={{ ...proseStyle, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                            ↳ shortcut: {d.shortcut}
                          </div>
                        )}
                        {d.example && (
                          <div style={{ ...proseStyle, marginTop: 4, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                            e.g. {d.example}
                          </div>
                        )}
                        {d.threshold_to_advance && (
                          <div style={{ ...metaStyle, marginTop: 4, color: '#7a8f92' }}>
                            → unlock next: {d.threshold_to_advance}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}

        {tab === 'Industry primers' && (
          <section>
            {primersFor(track).length > 0 ? (
              primersFor(track).map((p: any) => (
                <div key={p.sector} style={cardStyle}>
                  <h3 style={titleStyle}>{p.sector}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div style={proseStyle}>
                      <span style={metaStyle}>Margins:</span> {p.typical_margin_range}
                    </div>
                    <div style={proseStyle}>
                      <span style={metaStyle}>Cycle / KPI:</span> {p.cycle_or_kpi}
                    </div>
                    <div style={proseStyle}>
                      <span style={metaStyle}>Cost drivers:</span> {p.cost_drivers.join(', ')}
                    </div>
                    <div style={proseStyle}>
                      <span style={metaStyle}>Revenue drivers:</span> {p.revenue_drivers.join(', ')}
                    </div>
                  </div>
                  <div style={{ ...proseStyle, marginTop: 10, color: '#a64b52' }}>
                    <span style={metaStyle}>Disruption:</span>{' '}
                    <span style={{ color: 'var(--color-text-primary)' }}>{p.recent_disruption}</span>
                  </div>
                  <div style={{ ...proseStyle, marginTop: 6, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                    → ask interviewer: &ldquo;{p.diagnostic_q_for_interviewer}&rdquo;
                  </div>
                </div>
              ))
            ) : (
              <p style={proseStyle}>Industry primers not yet curated for this track.</p>
            )}
            {track === 'pm' && PM_APP_KPIS.length > 0 && (
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <h3 style={titleStyle}>App-specific KPIs (memorize these)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                  {PM_APP_KPIS.map((a) => (
                    <li
                      key={a.app}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ ...titleStyle, fontSize: 14, marginBottom: 4 }}>
                        {a.app} <span style={{ ...metaStyle, marginLeft: 8 }}>· {a.sector}</span>
                      </div>
                      <div style={proseStyle}>key: {a.key_metrics.join(', ')}</div>
                      <div style={proseStyle}>
                        NSM: <span style={{ color: '#7a8f92', fontWeight: 700 }}>{a.north_star}</span>{' '}
                        · counter: <span style={{ color: '#a64b52', fontWeight: 700 }}>{a.counter}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === 'Recovery' && (
          <section>
            <p style={{ ...proseStyle, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              When you blank mid-case, default to one of these scripts:
            </p>
            {def.recovery_scripts.map((r, i) => (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  background: 'var(--hupr-cream)',
                  fontFamily: 'var(--font-accent)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: 'var(--color-text-primary)',
                }}
              >
                &ldquo;{r}&rdquo;
              </div>
            ))}
          </section>
        )}

        {tab === 'Spike Phrases' && (
          <section>
            <p style={{ ...proseStyle, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              L4 moves that elevate 3 → 4 in interviewer&apos;s mind:
            </p>
            {def.killer_phrases.map((p, i) => (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  background: 'var(--hupr-slate)',
                  border: '1px solid var(--hupr-slate)',
                  fontFamily: 'var(--font-accent)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: '#FFFFFF',
                }}
              >
                &ldquo;{p}&rdquo;
              </div>
            ))}
          </section>
        )}

        {tab === 'Ask anything' && <AskTheCheatSheet track={track} weakestDims={weakestDims} />}

        {tab === '30 behavioral Qs' && <BehavioralThirty />}
      </div>
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
      <p style={{ ...proseStyle, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Ask a question — answered using your track&apos;s frameworks/math + your weak areas.
      </p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. 'What's a clean way to structure a market entry case for a B2B SaaS in India?'"
        style={{
          width: '100%',
          minHeight: 100,
          padding: 14,
          background: 'var(--color-bg-sunken)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          borderRadius: 4,
          outline: 'none',
          resize: 'vertical',
        }}
      />
      <button
        onClick={ask}
        disabled={loading || !q.trim()}
        className="hupr-anim-btn mt-3"
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
          opacity: loading || !q.trim() ? 0.5 : 1,
          display: 'inline-block',
        }}
      >
        <span className="top">{loading ? 'Thinking…' : 'Ask'}</span>
        <span className="btm">{loading ? 'Thinking…' : 'Ask'}</span>
      </button>
      {a && (
        <div
          style={{
            ...cardStyle,
            marginTop: 16,
            ...proseStyle,
            whiteSpace: 'pre-wrap',
          }}
        >
          {a}
        </div>
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
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
      <button
        onClick={() => { setOpen(!open); load(); }}
        className="hupr-mono-eyebrow underline"
        style={{
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
        }}
      >
        {open ? '▾' : '▸'} Cohort spike notes ({loaded ? notes.length : '…'})
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                background: 'var(--color-bg-sunken)',
                padding: 10,
                fontFamily: 'var(--font-accent)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                borderRadius: 3,
              }}
            >
              {n.body}
            </div>
          ))}
          {notes.length === 0 && loaded && (
            <div style={{ ...metaStyle, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
              No notes yet — be the first.
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a spike note (max 1000 chars)"
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                borderRadius: 3,
                outline: 'none',
              }}
            />
            <button
              onClick={submit}
              style={{
                padding: '8px 14px',
                background: 'var(--color-text-primary)',
                color: 'var(--color-bg-canvas)',
                border: 0,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: 3,
              }}
            >
              Add
            </button>
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
    <section>
      <p style={{ ...proseStyle, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        The 30 most-asked behavioral questions across MBA tracks. Each has a STAR scaffold + spike move + common mistake.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {dims.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            style={{
              background: filter === d ? 'var(--color-text-primary)' : 'transparent',
              color: filter === d ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
              border: '1px solid',
              borderColor: filter === d ? 'var(--color-text-primary)' : 'var(--color-border)',
              padding: '6px 12px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
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
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map((q, i) => (
          <li key={i} style={cardStyle}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
              <span style={titleStyle}>{q.prompt}</span>
              <span
                style={{
                  ...metaStyle,
                  background: 'var(--hupr-sage)',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 3,
                }}
              >
                {q.dimension}
              </span>
            </div>
            <div style={{ ...proseStyle, marginTop: 8 }}>
              <span style={{ ...metaStyle, color: '#7a8f92' }}>STAR:</span>{' '}
              {q.star_scaffold}
            </div>
            <div style={{ ...proseStyle, marginTop: 4 }}>
              <span style={{ ...metaStyle, color: '#3d5a6c' }}>Spike:</span>{' '}
              {q.spike_move}
            </div>
            <div style={{ ...proseStyle, marginTop: 4 }}>
              <span style={{ ...metaStyle, color: '#a64b52' }}>Common mistake:</span>{' '}
              {q.common_mistake}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
