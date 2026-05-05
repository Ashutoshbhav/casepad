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
          gridTemplateColumns: '1fr 380px',
          gap: 48,
          padding: '64px 36px 80px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {/* CASE TITLE + TRANSCRIPT — left column */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-v2-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 5vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: 'rgb(50,50,52)',
              margin: 0,
              marginBottom: 16,
              maxWidth: '14ch',
            }}
          >
            COFFEE CHAIN PROFITABILITY.
          </h1>
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

          {/* TRANSCRIPT — alternating left/right, no chat bubbles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {TRANSCRIPT.map((t, i) => {
              const isAsh = t.role === 'ash';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAsh ? 'flex-start' : 'flex-end',
                    maxWidth: '100%',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-v2-mono)',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(50,50,52,0.55)',
                      marginBottom: 8,
                    }}
                  >
                    {isAsh ? '— ASH · EM AT BAIN' : '— YOU'}
                  </span>
                  <p
                    style={{
                      fontFamily: 'var(--font-v2-mono)',
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: 'rgb(50,50,52)',
                      maxWidth: '54ch',
                      margin: 0,
                      textAlign: isAsh ? 'left' : 'right',
                    }}
                  >
                    {t.text}
                  </p>
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
                background: '#0E0E0E',
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

        {/* RIGHT COLUMN — issue-tree card sticky */}
        <aside
          style={{
            position: 'sticky',
            top: 36,
            alignSelf: 'flex-start',
            background: '#FFFFFF',
            padding: 22,
            height: 'fit-content',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgb(50,50,52)',
              paddingBottom: 8,
              borderBottom: '1px solid rgba(0,0,0,0.18)',
              marginBottom: 18,
            }}
          >
            Issue tree · live
          </div>
          <div style={{ position: 'relative', aspectRatio: '4 / 5' }}>
            <DecisionTreeOverlay
              stroke="rgb(50,50,52)"
              roughness={1.4}
              bowing={1.6}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.55)',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(0,0,0,0.18)',
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
