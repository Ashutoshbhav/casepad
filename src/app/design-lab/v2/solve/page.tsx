// /design-lab/v2/solve — HUPR-flavor case solving surface
//
// Transcript-as-document, not a chat UI. Alternating Plex Mono lines
// (left-aligned candidate, right-aligned interviewer, both 14px on
// cream) reads like a real interview transcript. Right side: floating
// issue-tree card with the live decision graph being drawn.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
import { Masthead, SectionEyebrow } from '../_components/masthead';
import { DecisionTreeOverlay } from '../_components/decision-tree-overlay';
import {
  SketchyCircle,
  SketchyConnector,
  SketchyUnderline,
  SketchyMarginRule,
  SketchyArrow,
  SketchyBracket,
  SketchyLine,
} from '../_components/sketchy';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v2-mono',
  weight: ['400', '500'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v2-display',
  weight: ['400', '500', '700', '800'],
});

export const metadata = {
  title: 'Design Lab v2 — Solve',
  robots: { index: false },
};

const TRANSCRIPT: Array<{ role: 'ash' | 'me'; text: string }> = [
  { role: 'ash',  text: 'A coffee chain’s profitability dropped 18% last quarter — but same-store sales are flat. Where would you start?' },
  { role: 'me',   text: 'I’d split it: revenue side vs cost side first. Same-store sales flat means revenue is roughly stable, so I’d lean cost-side.' },
  { role: 'ash',  text: 'Good. Defend that order — why revenue first then cost?' },
  { role: 'me',   text: 'Two reasons. One: the prompt gives revenue stability, so investigation cost is highest there. Two: cost-side typically has higher actionability if we find a leak.' },
  { role: 'ash',  text: 'Hmm. You’re assuming flat sales = flat revenue. What if the mix shifted?' },
  { role: 'me',   text: 'Fair — they could have traded down to lower-margin SKUs. Let me revise. I’d ask for revenue mix data first to confirm before going cost-side.' },
  { role: 'ash',  text: 'Sharper. What specifically would you ask for?' },
];

export default async function SolveV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-solve-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
      }}
    >
      <Masthead caption={['Practice', 'Room ·', 'Live Session']} />
      <SectionEyebrow label="Case Nº0427 · BCG" meta="profitability · 22 min · turn 04 of 06" />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 520px',
          gap: 56,
          padding: '64px 36px 80px',
          maxWidth: 1480,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* CASE TITLE + TRANSCRIPT — left column with notebook margin */}
        <div style={{ position: 'relative', paddingLeft: 36 }}>
          {/* NOTEBOOK MARGIN — vertical sketchy red rule running the
              full length of the column, like a real consultant's pad */}
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 12,
              opacity: 0.55,
            }}
          >
            <SketchyMarginRule height={1400} stroke="#A0394A" />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-v2-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 5vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: 'rgb(50,50,52)',
              margin: 0,
              marginBottom: 4,
              maxWidth: '14ch',
            }}
          >
            COFFEE CHAIN PROFITABILITY.
          </h1>
          <div style={{ width: 'min(280px, 40%)', marginBottom: 24 }}>
            <SketchyUnderline strokeWidth={4} roughness={2.2} bowing={3} />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'rgba(50,50,52,0.7)',
              maxWidth: '60ch',
              marginBottom: 56,
              padding: '14px 0',
              borderTop: '1px solid rgba(0,0,0,0.18)',
              borderBottom: '1px solid rgba(0,0,0,0.18)',
            }}
          >
            A coffee chain’s profitability dropped 18% last quarter despite
            same-store sales holding flat. The CFO has 30 minutes. Walk us
            through how you’d structure this.
          </p>

          {/* TRANSCRIPT — notebook entries. Ash's questions get a sketchy
              left-rule + bold eyebrow. Candidate replies get a sketchy
              left-bracket annotation, like a TA's marginal mark. Between
              each Ash → candidate turn pair, a sketchy down-arrow flows
              the conversation visually. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {TRANSCRIPT.map((t, i) => {
              const isAsh = t.role === 'ash';
              const prevWasAsh = i > 0 && TRANSCRIPT[i - 1].role === 'ash';
              return (
                <div key={i}>
                  {/* Sketchy down-arrow flowing from Ash's question into
                      the candidate's response — only between turn pairs */}
                  {!isAsh && prevWasAsh && (
                    <div
                      style={{
                        marginLeft: 32,
                        marginBottom: 18,
                        opacity: 0.6,
                        transform: 'rotate(90deg)',
                        transformOrigin: 'left center',
                        height: 12,
                      }}
                    >
                      <SketchyArrow width={48} height={14} stroke="rgba(50,50,52,0.5)" />
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      paddingLeft: isAsh ? 0 : 4,
                    }}
                  >
                    {/* Candidate reply gets a sketchy bracket annotation
                        on the left — like a TA's mark on your work */}
                    {!isAsh && (
                      <div style={{ flexShrink: 0, height: 'auto', alignSelf: 'stretch', minHeight: 60 }}>
                        <SketchyBracket
                          height={Math.max(60, t.text.length * 0.45 + 20)}
                          side="left"
                          stroke="rgba(50,50,52,0.55)"
                        />
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        maxWidth: '60ch',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-v2-mono)',
                          fontSize: 10,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: isAsh ? 'rgb(50,50,52)' : 'rgba(50,50,52,0.55)',
                          fontWeight: isAsh ? 600 : 400,
                          marginBottom: 8,
                        }}
                      >
                        {isAsh ? 'ASH · EM AT BAIN ↓' : 'YOU'}
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--font-v2-mono)',
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: 'rgb(50,50,52)',
                          margin: 0,
                          fontWeight: isAsh ? 500 : 400,
                        }}
                      >
                        {t.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input affordance — single-line, no card chrome */}
          <div
            style={{
              marginTop: 56,
              paddingTop: 20,
              borderTop: '1px solid rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <input
              type="text"
              placeholder="Type your move…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 14,
                color: 'rgb(50,50,52)',
                padding: '12px 0',
              }}
            />
            <button
              type="button"
              style={{
                // refero: cursor — Onyx Outline #f54e00 primary CTA.
                background: '#f54e00',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                padding: '10px 22px',
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Send →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN — the candidate's notebook scratchpad. BIG live
            issue tree taking the full right column, like a real
            consultant's working pad. Sticky so it's always visible
            while the candidate scrolls the transcript. */}
        <aside
          style={{
            position: 'sticky',
            top: 36,
            alignSelf: 'flex-start',
            background: '#FFFFFF',
            padding: '24px 24px 28px',
            height: 'fit-content',
            boxShadow: '0 12px 40px -16px rgba(50,50,52,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingBottom: 12,
              borderBottom: '1px solid rgba(0,0,0,0.18)',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-v2-mono)',
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgb(50,50,52)',
              }}
            >
              Issue tree
            </span>
            <span
              style={{
                fontFamily: 'var(--font-v2-mono)',
                fontWeight: 400,
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(50,50,52,0.55)',
              }}
            >
              · drawing live
            </span>
          </div>
          <div style={{ width: '100%', marginBottom: 12 }}>
            <SketchyLine stroke="rgba(50,50,52,0.55)" strokeWidth={1.2} roughness={1.8} />
          </div>
          <div style={{ position: 'relative', height: 520 }}>
            <DecisionTreeOverlay
              stroke="rgb(50,50,52)"
              roughness={1.5}
              bowing={1.8}
            />
          </div>
          {/* Turn counter — 6 sketchy circles, first 4 filled (turns
              completed), last 2 hollow (remaining). Hand-drawn feel
              consistent with the issue tree above. */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <SketchyCircle
                  size={20}
                  filled={i < 4}
                  stroke="rgb(50,50,52)"
                  fillColor="rgb(50,50,52)"
                  roughness={i === 4 ? 0.8 : 1.4}
                />
                {i < 5 && (
                  <SketchyConnector
                    width={6}
                    stroke={i < 3 ? 'rgba(50,50,52,0.6)' : 'rgba(50,50,52,0.25)'}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.55)',
              marginTop: 12,
            }}
          >
            04 / 06 turns · 18 min remaining
          </div>
        </aside>
      </section>

      <a
        href="/design-lab"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 24,
          fontFamily: 'var(--font-v2-mono)',
          fontSize: 10,
          color: 'rgba(50,50,52,0.5)',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          zIndex: 50,
        }}
      >
        ← Design Lab v2 · Solve
      </a>
    </main>
  );
}
