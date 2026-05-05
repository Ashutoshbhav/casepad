// Loud — ByFrontYard-flavor sample, post-deep-research-via-Playwright.
//
// REAL DNA extracted from byfrontyard.com via computed-style inspection:
//   - canvas:  rgb(245,245,245) light gray — NOT pure white
//   - text:    rgb(0,0,0) pure black
//   - fonts:   Instrument Sans Bold (700) + Fragment Mono (Google Fonts)
//   - HUGE display: "be" rendered at 663.935px! "Don't" 202px,
//                   "boring." 217px. The middle word is GIGANTIC.
//   - letter-spacing: -2% (-4px on 200px, -13px on 660px)
//   - section H2: Instrument Sans 700 / 60px / -1.2px tracking
//   - links: default browser blue rgb(0,0,238) — intentional anti-design
//   - numbered nav: "01 About / 02 Services / 03 Work / 04 Contact"
//   - magenta-to-teal gradient at the bottom transition
//   - white floating pill at top with wordmark
//
// The signature is the typographic SHOUT — a punchline at variable
// sizes where one word dominates. CasePad equivalent: "Don't / SLOG /
// today." or "Practice / NOW / again."

import { Instrument_Sans, Fragment_Mono } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-l-display',
  weight: ['400', '500', '600', '700'],
});
const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-l-mono',
  weight: ['400'],
});

export const metadata = {
  title: 'Design Lab — Loud (ByFrontYard-flavor)',
  robots: { index: false },
};

export default async function LoudPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`loud-scope ${instrument.variable} ${fragmentMono.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(245,245,245)',
        color: 'rgb(0,0,0)',
        fontFamily: 'var(--font-l-display)',
        overflow: 'hidden',
      }}
    >
      {/* TOP — black bar at top with the dramatic gradient transition.
          The page transitions from black canvas (top half) to a magenta
          → teal gradient (bottom third) where the giant headline lives. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg,
            #0E0E0E 0%,
            #0E0E0E 38%,
            #2A1530 55%,
            #5A1F4A 70%,
            #B9285E 82%,
            #5FE6D7 100%
          )`,
        }}
      />

      {/* FLOATING WHITE PILL NAV TOP — exact ByFrontYard composition:
          white rounded card centered at top, wordmark left + dot icon right */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: 'min(640px, 60vw)',
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '14px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-l-display)',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '0.02em',
            color: '#000000',
          }}
        >
          CASEPAD
        </span>
        {/* Black dot icon — like ByFrontYard's right-side dot */}
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background:
              'radial-gradient(circle at 30% 30%, #444 0%, #000 75%)',
            display: 'inline-block',
          }}
        />
      </div>

      {/* RIGHT-COLUMN small body text — like ByFrontYard's "You're
          building something great. We help you tell the world why it
          matters." */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          right: 36,
          zIndex: 8,
          maxWidth: 280,
          color: '#FFFFFF',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-l-display)',
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          You&apos;re preparing for the case. We make sure you&apos;ve
          already done the rep before the partner asks.
        </p>
      </div>

      {/* NUMBERED NAV LEFT — "01 Today / 02 Cases / 03 Library / 04
          Cohort", default-blue links exactly per FY anti-design */}
      <nav
        style={{
          position: 'absolute',
          top: 220,
          left: 36,
          zIndex: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {[
          ['01', 'Today'],
          ['02', 'Cases'],
          ['03', 'Library'],
          ['04', 'Cohort'],
        ].map(([num, label]) => (
          <a
            key={num}
            href="#"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              textDecoration: 'none',
              color: 'rgb(0, 0, 238)',
              fontFamily: 'var(--font-l-mono)',
              fontSize: 12,
              fontWeight: 400,
            }}
          >
            <span style={{ minWidth: 22 }}>{num}</span>
            <span style={{ fontFamily: 'var(--font-l-display)', fontWeight: 500 }}>
              {label}
            </span>
          </a>
        ))}
      </nav>

      {/* BIG HEADLINE — variable-size punchline at the bottom of the
          gradient transition. "Don't / SLOG / today." with the middle
          word at ~660px like FY's "be". Anchored to the bottom edge,
          baseline-aligned, white. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 80,
          zIndex: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#FFFFFF',
          pointerEvents: 'none',
        }}
      >
        {/* Top word — "Don't" at ~200px (FY's exact ratio) */}
        <span
          style={{
            fontFamily: 'var(--font-l-display)',
            fontWeight: 700,
            fontSize: 'clamp(80px, 14vw, 200px)',
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            marginBottom: '-0.05em',
          }}
        >
          Don&apos;t
        </span>
        {/* Middle word — GIGANTIC, "SLOG" at ~660px */}
        <span
          style={{
            fontFamily: 'var(--font-l-display)',
            fontWeight: 700,
            fontSize: 'clamp(180px, 38vw, 540px)',
            lineHeight: 0.84,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            margin: '-0.04em 0',
          }}
        >
          slog.
        </span>
      </div>

      {/* SCROLL CUE bottom-center, like FY's "↓ SCROLL" */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 11,
          fontFamily: 'var(--font-l-mono)',
          fontSize: 11,
          color: '#FFFFFF',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        ↓ Scroll
      </div>

      {/* I-WANT-THIS CTA top-right — default blue link like FY's
          "[I WANT THIS]" */}
      <a
        href="#"
        style={{
          position: 'absolute',
          top: 220,
          right: 36,
          marginTop: 100,
          zIndex: 9,
          fontFamily: 'var(--font-l-mono)',
          fontSize: 12,
          color: 'rgb(0, 0, 238)',
          textDecoration: 'underline',
          letterSpacing: '0.04em',
        }}
      >
        I want in →
      </a>

      {/* BACK BAR */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 36,
          zIndex: 12,
        }}
      >
        <a
          href="/design-lab"
          style={{
            fontFamily: 'var(--font-l-mono)',
            fontSize: 10,
            color: '#FFFFFF',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            opacity: 0.6,
          }}
        >
          ← Design Lab · Loud
        </a>
      </div>
    </main>
  );
}
