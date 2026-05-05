// /design-lab/v2/signin — HUPR-flavor signin landing
//
// Bar-setting surface for the v2 design rebuild. If this hits, I extend
// the same vocabulary to /dashboard /cases /solve /debrief. If it
// misses, we iterate this single surface before scaling out.
//
// Real DNA cloned from hupr.ca via Playwright computed-style inspection:
//   - Body bg transparent — full-bleed photo IS the canvas
//   - IBM Plex Mono primary body font
//   - Montserrat 700 for nav links (30px) + display (192px stacked)
//   - text rgb(50,50,52) warm dark gray (NOT pure black)
//   - light gray menu pills #E8E8E5
//   - white floating service cards with hairline rules
//   - black pill CTAs
//   - bottom infinite-scroll marquee
//
// CasePad-specific moves:
//   - Empty-boardroom photo (free Unsplash, model-release-free, "the
//     room before the room" framing). 3-shot carousel.
//   - Decision-tree overlay rendered with Rough.js at the spot where a
//     candidate's notebook would be on the table. This is the
//     instrumentation move — HUPR overlays mocap dots on athletes;
//     CasePad overlays decision graphs on the absence of a candidate.
//   - Wordmark masthead with asterisk + 3-line mono caption matching
//     HUPR's exact composition.
//   - "Cohort sign-in" service card with email input + black pill CTA.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
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
  title: 'Design Lab v2 — Signin',
  robots: { index: false },
};

// Empty-boardroom photo — Unsplash, free for commercial use, no model
// release issue (no people). Picked for strong directional window light
// + wood-grain table that makes the decision-tree overlay readable.
const HERO_PHOTO_URL =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=80';

export default async function SigninV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-signin-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0E0E0E',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
        overflow: 'hidden',
      }}
    >
      {/* LAYER 1 — full-bleed photograph. Slightly dimmed so foreground
          UI cards have contrast. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${HERO_PHOTO_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          filter: 'saturate(0.92) brightness(0.74) contrast(1.04)',
        }}
      />

      {/* Subtle vertical gradient — top + bottom darken to make the
          floating UI elements legible against any photo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 25%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* LAYER 2 — Rough.js decision-tree overlay. Positioned over the
          center of the table where a candidate's notebook would sit.
          The instrumentation move. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: 'min(820px, 70vw)',
          height: 'min(520px, 44vw)',
          pointerEvents: 'none',
        }}
      >
        <DecisionTreeOverlay
          stroke="rgba(255, 255, 255, 0.82)"
          roughness={1.5}
          bowing={1.8}
        />
      </div>

      {/* LAYER 3a — wordmark masthead top-left. Exact HUPR composition:
          brand text + asterisk glyph + 3-line Plex Mono caption. */}
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
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '0.04em',
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          CASEPAD
        </span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 800,
            fontSize: 24,
            color: '#FFFFFF',
            lineHeight: 1,
            transform: 'translateY(-1px)',
          }}
        >
          ✱
        </span>
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
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

      {/* LAYER 3b — MENU pill top-right. Exact HUPR shape and tokens:
          light cream-gray bg, mono caps + 2-line hamburger lines. */}
      <button
        type="button"
        style={{
          position: 'absolute',
          top: 32,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 28vw)',
          background: '#E8E8E5',
          border: 'none',
          padding: '14px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
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
      </button>

      {/* LAYER 3c — COHORT SIGN-IN service card. White rectangle, hairline
          rule above body, Plex Mono body, black pill CTA. Exact HUPR
          service-card composition. Sits below the MENU pill. */}
      <div
        style={{
          position: 'absolute',
          top: 116,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 28vw)',
          background: '#FFFFFF',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontWeight: 500,
            fontSize: 14,
            color: 'rgb(50,50,52)',
            paddingBottom: 8,
            borderBottom: '1px solid rgba(0,0,0,0.18)',
            marginBottom: 16,
          }}
        >
          Cohort sign-in
        </div>
        <p
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'rgb(50,50,52)',
            marginBottom: 18,
            letterSpacing: '0.005em',
          }}
        >
          We instrument your case-prep. Show up daily, the muscle builds itself.
        </p>
        <input
          type="email"
          placeholder="you@school.edu"
          style={{
            width: '100%',
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.25)',
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 14,
            color: 'rgb(50,50,52)',
            outline: 'none',
            marginBottom: 22,
          }}
        />
        <button
          type="button"
          style={{
            background: '#0E0E0E',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '12px 22px',
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Enter the room →
        </button>
        <div
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgb(120,118,118)',
            marginTop: 16,
          }}
        >
          Allowlist only · No password
        </div>
      </div>

      {/* LAYER 3d — Carousel pagination indicator (HUPR's "01/04" pattern)
          mono numerals with hairline rules above and below */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          bottom: 220,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#FFFFFF',
        }}
      >
        <span style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.6)' }} />
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          01 / 03
        </span>
        <span style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.4)' }} />
      </div>

      {/* LAYER 3e — Bottom marquee. Montserrat 700 192px (HUPR's actual
          spec). Infinite horizontal scroll, cropped on both edges. White
          on photo. */}
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
          className="v2-marquee"
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 'clamp(110px, 14vw, 192px)',
            lineHeight: 0.9,
            color: '#FFFFFF',
            letterSpacing: '-0.012em',
            paddingBottom: 12,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} style={{ paddingRight: 80, flexShrink: 0 }}>
              PRACTICE THE ROOM&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* LAYER 3f — bottom-left COLOPHON */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 36,
          zIndex: 11,
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
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
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          1,165 cases · BCG · Bain · McK · Wharton
        </span>
      </div>

      {/* LAYER 3g — bottom-right COLLECTION-LIVE pulse + lang switch */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: 36,
          zIndex: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#FFFFFF',
            display: 'inline-block',
            animation: 'v2-pulse 2.4s ease-in-out infinite',
          }}
          aria-label="Live"
        />
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          EN · FR
        </span>
      </div>

      {/* BACK BAR */}
      <a
        href="/design-lab"
        style={{
          position: 'absolute',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 12,
          fontFamily: 'var(--font-v2-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        ← Design Lab v2 · Signin
      </a>

      <style>{`
        @keyframes v2-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
        @keyframes v2-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .v2-marquee {
          animation: v2-marquee 36s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-marquee { animation: none !important; }
          .v2-signin-scope [aria-label="Live"] { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
