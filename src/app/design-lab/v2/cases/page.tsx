// /design-lab/v2/cases — HUPR-flavor library with track-color bands
//
// Direct port of HUPR's solid-color editorial section pattern. Each
// track gets its own full-bleed colored band: beige (Strategy),
// burgundy (Profitability), slate (Market Entry). Each band contains
// a 4-col grid of dark case-card rectangles + Plex Mono captions.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
import { Masthead, SectionEyebrow, Marquee } from '../_components/masthead';
import { SketchyCornerTick, SketchyUnderline } from '../_components/sketchy';

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
  title: 'Design Lab v2 — Cases',
  robots: { index: false },
};

const TRACKS = [
  {
    label: 'Strategy',
    // Earth-jewel palette. Pastels (Coda quartet) read too candy/
    // SaaS for case-prep — deep moss says "leather-bound library
    // shelf, considered work." White text returns.
    bg: '#3e5b4f',
    cases: [
      { title: 'Airline Network', source: 'BAIN' },
      { title: 'Telco Repositioning', source: 'MCK' },
      { title: 'Bank Spinoff', source: 'BCG' },
      { title: 'Healthcare Payer', source: 'IVEY' },
      { title: 'Auto OEM Strategy', source: 'WHARTON' },
      { title: 'Retail Repositioning', source: 'OW' },
      { title: 'Tech Platform', source: 'AT KEARNEY' },
      { title: 'CPG Channel Mix', source: 'HBS' },
    ],
  },
  {
    label: 'Profitability',
    // Earth-jewel — oxblood. Richer than the original burgundy,
    // closer to leather-armchair / book-cover red.
    bg: '#7a2837',
    cases: [
      { title: 'Coffee Chain', source: 'BCG' },
      { title: 'Pharma Profit', source: 'MCK' },
      { title: 'Steel Mill', source: 'BAIN' },
      { title: 'SaaS Margin', source: 'WHARTON' },
      { title: 'Logistics Cost', source: 'IVEY' },
      { title: 'Retail Pricing', source: 'BCG' },
      { title: 'Insurance Mix', source: 'OW' },
      { title: 'Hotel Yield', source: 'HBS' },
    ],
  },
  {
    label: 'Market Entry',
    // Earth-jewel — slate-navy. Cool counterpoint to the moss + oxblood;
    // serious, navigational, "you're going somewhere new."
    bg: '#34465c',
    cases: [
      { title: 'EV in India', source: 'MCK' },
      { title: 'D2C Brand', source: 'BAIN' },
      { title: 'Streaming SE-Asia', source: 'BCG' },
      { title: 'Fintech Africa', source: 'WHARTON' },
      { title: 'Pharma LatAm', source: 'IVEY' },
      { title: 'Retail Japan', source: 'HBS' },
      { title: 'Telco MENA', source: 'AT KEARNEY' },
      { title: 'EdTech Brazil', source: 'OW' },
    ],
  },
];

export default async function CasesV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-cases-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
      }}
    >
      <Masthead caption={['The', 'Library of', '1,165 Cases']} />
      <SectionEyebrow label="Library · 3 tracks" meta="filter: all · search ⌘K" />

      {/* HERO HEADLINE */}
      <section style={{ padding: '120px 36px 64px', maxWidth: 1400, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 'clamp(64px, 10vw, 156px)',
            lineHeight: 0.92,
            letterSpacing: '-0.025em',
            color: 'rgb(50,50,52)',
            margin: 0,
            maxWidth: '12ch',
          }}
        >
          THE LIBRARY.
        </h1>
        <div style={{ width: 'min(360px, 30vw)', marginTop: 12 }}>
          <SketchyUnderline strokeWidth={5} roughness={2.4} bowing={4} />
        </div>
        <p
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(50,50,52,0.7)',
            maxWidth: '52ch',
            marginTop: 32,
            letterSpacing: '0.005em',
          }}
        >
          Every case sourced from a real casebook — Bain · BCG · McKinsey ·
          Wharton · Ivey · HBS. Filed by track. Annotated by the cohort. The
          archive is the work.
        </p>
      </section>

      {/* TRACK BANDS — full-bleed colored sections */}
      {TRACKS.map((track) => (
        <section key={track.label} style={{ background: track.bg, padding: '80px 36px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingBottom: 16,
                // Earth-jewel bands are deep saturated darks → white
                // text reads cleanly again.
                borderBottom: '1px solid rgba(255,255,255,0.30)',
                marginBottom: 32,
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-v2-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 7vw, 92px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                {track.label.toUpperCase()}.
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-v2-mono)',
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.78)',
                }}
              >
                {String(track.cases.length).padStart(2, '0')} cases
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 18,
              }}
            >
              {track.cases.map((c) => (
                <div
                  key={c.title}
                  style={{
                    position: 'relative',
                    // Warm-dark #1a1817 (production's bg-elevated)
                    // replaces flat gray. Reads as leather-bound
                    // book cover, not a Slack message bubble.
                    background: '#1a1817',
                    aspectRatio: '4 / 5',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    color: '#FFFFFF',
                    // refero: elevenlabs — hairline inset border on
                    // dark cards. Reads as "this surface is lifted /
                    // clickable" without breaking flat aesthetic.
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
                  }}
                >
                  {/* Sketchy corner tick — every case card carries the
                      instrumentation mark, even at this small scale. */}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <SketchyCornerTick size={18} stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-v2-mono)',
                      fontSize: 10,
                      // refero: anthropic — wide positive tracking
                      // on uppercase mono metadata (library-card /
                      // journal field-label convention).
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.62)',
                    }}
                  >
                    {c.source}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-v2-display)',
                      fontWeight: 700,
                      fontSize: 20,
                      lineHeight: 1.12,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {c.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <div style={{ padding: '120px 0 0', background: '#F5F0E8' }}>
        <Marquee text="THE ARCHIVE IS THE WORK" variant="dark" />
      </div>

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
        ← Design Lab v2 · Cases
      </a>
    </main>
  );
}
