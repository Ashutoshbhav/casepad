// /design-lab/v2/dashboard — HUPR-flavor type-mode dashboard
//
// No photo on this surface (HUPR's about-page pattern). Massive stacked
// display headline as the centerpiece, followed by case meta + black
// pill CTA, recent-reps card grid, streak as 7-day calendar dots.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
import { Masthead, SectionEyebrow, Marquee } from '../_components/masthead';

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
  title: 'Design Lab v2 — Dashboard',
  robots: { index: false },
};

export default async function DashboardV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  // 7-day streak calendar — last 7 days, today is the rightmost
  const days = Array.from({ length: 7 }).map((_, i) => ({
    day: i,
    active: [0, 1, 2, 4, 5, 6].includes(i), // mock: 6 of 7 days
    today: i === 6,
  }));

  return (
    <main
      className={`v2-dashboard-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
      }}
    >
      <Masthead />
      <SectionEyebrow label="Today · Day 12" meta="cohort one · ssb · scaler" />

      {/* HERO — massive stacked headline */}
      <section style={{ padding: '120px 36px 80px', maxWidth: 1400, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 'clamp(64px, 12vw, 192px)',
            lineHeight: 0.92,
            letterSpacing: '-0.025em',
            color: 'rgb(50,50,52)',
            margin: 0,
            maxWidth: '14ch',
          }}
        >
          COFFEE CHAIN PROFITABILITY.
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginTop: 56,
            paddingTop: 24,
            borderTop: '1px solid rgba(0,0,0,0.18)',
            maxWidth: 760,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.65)',
            }}
          >
            BCG · Profitability · 22 min
          </span>
          <button
            type="button"
            style={{
              marginLeft: 'auto',
              background: '#0E0E0E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '14px 32px',
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Begin →
          </button>
        </div>
      </section>

      {/* STREAK — 7 calendar dots */}
      <section style={{ padding: '40px 36px 120px', maxWidth: 1400, margin: '0 auto' }}>
        <SectionEyebrow label="Streak · 6 of 7 days" />
        <div
          style={{
            display: 'flex',
            gap: 14,
            paddingTop: 32,
            paddingBottom: 32,
          }}
        >
          {days.map((d) => (
            <div
              key={d.day}
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                background: d.active ? 'rgb(50,50,52)' : 'transparent',
                border: d.today
                  ? '2px solid rgb(50,50,52)'
                  : '1px solid rgba(50,50,52,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 11,
                color: d.active ? '#F5F0E8' : 'rgba(50,50,52,0.5)',
                letterSpacing: '0.08em',
              }}
            >
              {d.today ? 'TDY' : `D${d.day + 1}`}
            </div>
          ))}
        </div>
      </section>

      {/* RECENT REPS — uniform dark card grid */}
      <section style={{ padding: '40px 36px 120px', maxWidth: 1400, margin: '0 auto' }}>
        <SectionEyebrow label="Recent reps" meta="last 8 sessions" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
            paddingTop: 32,
          }}
        >
          {[
            { title: 'Airline Pricing', source: 'BAIN', score: 78, mins: 24 },
            { title: 'Pharma M&A', source: 'MCK', score: 71, mins: 28 },
            { title: 'Retail Profit', source: 'BCG', score: 84, mins: 22 },
            { title: 'Tech GTM', source: 'WHARTON', score: 69, mins: 19 },
            { title: 'Auto Estimation', source: 'IVEY', score: 73, mins: 16 },
            { title: 'Bank Costs', source: 'OW', score: 66, mins: 25 },
            { title: 'Telco Entry', source: 'AT KEARNEY', score: 80, mins: 21 },
            { title: 'Retail Pricing', source: 'BCG', score: 75, mins: 20 },
          ].map((c) => (
            <div
              key={c.title}
              style={{
                background: 'rgb(58,58,58)',
                aspectRatio: '4 / 5',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#F5F0E8',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-v2-mono)',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.55)',
                    marginBottom: 12,
                  }}
                >
                  {c.source}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-v2-display)',
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.title}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-v2-mono)',
                    fontSize: 28,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {c.score}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-v2-mono)',
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.55)',
                  }}
                >
                  {c.mins} MIN
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Marquee text="THE PRACTICE COMPOUNDS" variant="dark" />

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
        ← Design Lab v2 · Dashboard
      </a>
    </main>
  );
}
