// Instrument — HUPR-flavor sample, post-deep-research-via-Playwright.
//
// REAL DNA extracted from hupr.ca via computed-style inspection:
//   - body bg: transparent (full-bleed photo IS the canvas)
//   - body color: rgb(50,50,52) warm dark gray (NOT pure black)
//   - body font: "IBM Plex Mono" — mono is the BODY face, not just labels.
//     This is the sophisticated move: it gives a "research / data /
//     lab notebook" feel that pure-sans cannot.
//   - display: Montserrat 700 (nav links 30px) + Moderustic (huge marquee)
//   - signature: full-bleed athlete photograph with motion-capture dots +
//     connector lines overlaid on the body — they *instrument* the human.
//
// CasePad's parallel to motion-capture: an issue-tree decision-graph
// overlay drawn on the photograph. Their photo instruments physical
// movement; ours instruments *mental* movement (the candidate's case
// structure) → captured as a decision graph in the same visual grammar
// (small dot endpoints, thin white connector lines, asymmetric drape).
//
// This is the conceptual move: CasePad turns the candidate's thinking
// into an instrumented-and-trackable artifact, the same way HUPR turns
// physical performance into one. The photo + overlay literally tells
// you what the product does without a single line of explanatory copy.
//
// Free font substitutions for HUPR's stack:
//   - IBM Plex Mono ✓ Google Fonts (same face HUPR uses)
//   - Montserrat ✓ Google Fonts (variable, same face)
//   - HUPR's Moderustic (paid sculpted display) → Anton (Google Fonts)
//     for the bottom marquee. Anton is the closest free condensed-bold-
//     display to Moderustic's mood.

import { IBM_Plex_Mono, Montserrat, Anton } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-in-mono',
  weight: ['400', '500'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-in-display',
  weight: ['400', '500', '700', '800'],
});
const anton = Anton({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-in-marquee',
  weight: ['400'],
});

export const metadata = {
  title: 'Design Lab — Instrument (HUPR-flavor, post-research)',
  robots: { index: false },
};

// Unsplash photograph — consulting / boardroom / hands-with-notebook
// context. License is Unsplash (free for any use). Sized to ~2400px so
// it stays sharp on retina displays. Stable photo ID from Unsplash CDN.
const HERO_PHOTO_URL =
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2400&q=80';

export default async function InstrumentPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`instrument-scope ${plexMono.variable} ${montserrat.variable} ${anton.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0E0E0E',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-in-mono)',
        overflow: 'hidden',
      }}
    >
      {/* LAYER 1 — full-bleed photograph. Slightly desaturated + darkened
          via filter so foreground UI cards have contrast. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${HERO_PHOTO_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          filter: 'saturate(0.85) brightness(0.78) contrast(1.05)',
        }}
      />

      {/* LAYER 2 — instrument overlay. SVG decision-tree drawn over the
          subject. White 1.5px strokes, small dot endpoints. The CasePad
          analog of HUPR's motion-capture instrumentation. Positioned
          absolute, sized to viewport. Pointer-events: none. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          mixBlendMode: 'normal',
        }}
      >
        {/* Decision-graph nodes + connectors — drawn loosely, like a
            consultant scribbling structure on the candidate's image.
            The graph reads as "this is the candidate's case framework
            being instrumented as it forms". */}
        <g stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          {/* Root → 3 branches → 6 leaves layout, asymmetric */}
          <line x1="640" y1="220" x2="540" y2="340" />
          <line x1="640" y1="220" x2="700" y2="340" />
          <line x1="640" y1="220" x2="820" y2="340" />
          <line x1="540" y1="340" x2="490" y2="460" />
          <line x1="540" y1="340" x2="600" y2="460" />
          <line x1="700" y1="340" x2="700" y2="460" />
          <line x1="820" y1="340" x2="780" y2="460" />
          <line x1="820" y1="340" x2="900" y2="460" />
          <line x1="490" y1="460" x2="450" y2="580" />
          <line x1="600" y1="460" x2="610" y2="580" />
          <line x1="780" y1="460" x2="780" y2="580" />
        </g>
        {/* Filled-square node markers, like HUPR's mocap dots */}
        <g fill="rgba(255,255,255,0.95)">
          {[
            [640, 220, 7],
            [540, 340, 5],
            [700, 340, 5],
            [820, 340, 5],
            [490, 460, 4],
            [600, 460, 4],
            [700, 460, 4],
            [780, 460, 4],
            [900, 460, 4],
            [450, 580, 3],
            [610, 580, 3],
            [780, 580, 3],
          ].map(([x, y, s], i) => (
            <rect key={i} x={(x as number) - (s as number) / 2} y={(y as number) - (s as number) / 2} width={s as number} height={s as number} />
          ))}
        </g>
        {/* Outline circle nodes for variation (HUPR mixes squares + circles) */}
        <g stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" fill="none">
          <circle cx="600" cy="460" r="9" />
          <circle cx="780" cy="460" r="9" />
        </g>
      </svg>

      {/* LAYER 3a — wordmark top-left (HUPR exact pattern: brand + glyph
          + 3-line mono caption) */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 36,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-in-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '0.08em',
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          CASEPAD
        </span>
        {/* The asterisk glyph — typographic mark, not 3D character */}
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-in-display)',
            fontWeight: 800,
            fontSize: 22,
            color: '#FFFFFF',
            lineHeight: 1,
            transform: 'translateY(-1px)',
          }}
        >
          ✱
        </span>
        <span
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontWeight: 400,
            fontSize: 11,
            lineHeight: 1.45,
            color: '#FFFFFF',
            letterSpacing: '0.02em',
            paddingLeft: 6,
          }}
        >
          Practice<br />
          Centre for<br />
          Consulting Cases
        </span>
      </div>

      {/* LAYER 3b — floating MENU pill top-right (HUPR exact pattern) */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 30vw)',
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.04)',
          padding: '14px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontWeight: 500,
            fontSize: 14,
            color: 'rgb(50,50,52)',
            letterSpacing: '0.02em',
          }}
        >
          MENU
        </span>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ display: 'block', width: 22, height: 1, background: 'rgb(50,50,52)' }} />
          <span style={{ display: 'block', width: 22, height: 1, background: 'rgb(50,50,52)' }} />
        </span>
      </div>

      {/* LAYER 3c — floating SERVICE OFFER card right-mid (HUPR exact
          composition: white card, hairline rule, mono body, black pill CTA) */}
      <div
        style={{
          position: 'absolute',
          top: 124,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 30vw)',
          background: '#FFFFFF',
          padding: '24px 24px 24px 24px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontWeight: 500,
            fontSize: 14,
            color: 'rgb(50,50,52)',
            paddingBottom: 8,
            borderBottom: '1px solid rgba(0,0,0,0.18)',
            marginBottom: 16,
          }}
        >
          Today’s Case
        </div>
        <p
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'rgb(50,50,52)',
            marginBottom: 24,
            letterSpacing: '0.005em',
          }}
        >
          A coffee chain’s profitability dropped 18% last quarter — but
          same-store sales held flat. Where would you start?
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            fontFamily: 'var(--font-in-mono)',
            fontSize: 11,
            color: 'rgb(120,118,118)',
          }}
        >
          <span>BCG · Profitability</span>
          <span>≈ 22 min</span>
        </div>
        <button
          type="button"
          style={{
            background: '#0E0E0E',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '12px 22px',
            fontFamily: 'var(--font-in-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Begin →
        </button>
      </div>

      {/* LAYER 3d — bottom MARQUEE — massive Anton display type, cropped
          on both sides like HUPR's "PERFORMING ARTS". Animated infinite
          scroll. Uses CSS keyframes; reduced-motion stops the animation. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          className="instrument-marquee"
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-in-marquee)',
            fontWeight: 400,
            fontSize: 'clamp(120px, 17vw, 280px)',
            lineHeight: 0.85,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.01em',
            paddingBottom: 14,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} style={{ paddingRight: 64, flexShrink: 0 }}>
              PRACTICE THE ROOM&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* LAYER 3e — bottom-left COLOPHON — small mono attribution strip
          like HUPR's footer caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 36,
          zIndex: 11,
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          ✱ Cohort One · MMXXVI
        </span>
        <span
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          1,165 cases · BCG · Bain · McK · Wharton
        </span>
      </div>

      {/* LAYER 3f — bottom-right LIVE PULSE (the only animated element
          besides the marquee — keeps motion sparse) */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 36,
          zIndex: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: '#C9B184',
            animation: 'instrument-pulse 2.4s ease-in-out infinite',
            display: 'inline-block',
          }}
          aria-label="Live"
        />
        <span
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Live · Day 12
        </span>
      </div>

      {/* BACK BAR */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 12,
        }}
      >
        <a
          href="/design-lab"
          style={{
            fontFamily: 'var(--font-in-mono)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Design Lab · Instrument
        </a>
      </div>

      <style>{`
        @keyframes instrument-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,177,132,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(201,177,132,0); }
        }
        @keyframes instrument-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .instrument-marquee {
          animation: instrument-marquee 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .instrument-marquee { animation: none !important; }
          .instrument-scope [aria-label="Live"] { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
