// Practice Room — the "$100k" attempt for /signin
//
// Vibe brief (locked 2026-05-06):
//   "A quiet practice room where serious people prepare for serious
//    interviews."
//
// What separates this from prior amateur attempts:
//   - Editorial composition (newspaper-spread asymmetric, not centered hero)
//   - Single warm amber accent — used like a bookmark, never decoration
//   - Numbers as editorial focal points (1,165 cases, day count, time
//     to interview window)
//   - Subtle paper-grain SVG noise overlay (~3% opacity) for warmth
//   - Asterisk demoted from 3D character to a typographic mark in the
//     corner — silent editorial signature
//   - Type at intentional weights / sizes, not Google-Font defaults
//   - One signature detail: a hairline amber rule that drops vertically
//     through the composition, anchoring the layout

import { Newsreader, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

const editorial = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pr-editorial',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
});
const body = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pr-body',
  weight: ['300', '400', '500', '600'],
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pr-mono',
  weight: ['400', '500'],
});

export const metadata = {
  title: 'Design Lab — Practice Room (the $100k attempt)',
  robots: { index: false },
};

const TODAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());

export default async function PracticeRoomPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`practice-room-scope ${editorial.variable} ${body.variable} ${mono.variable}`}
      style={{
        ['--pr-canvas' as any]: '#15110D',
        ['--pr-canvas-light' as any]: '#1B1612',
        ['--pr-paper' as any]: '#F4EFE4',
        ['--pr-ink' as any]: '#F0E9D7',
        ['--pr-ink-2' as any]: '#A89B82',
        ['--pr-ink-3' as any]: '#6B6052',
        ['--pr-amber' as any]: '#E8A04A',
        ['--pr-amber-deep' as any]: '#C57F2E',
        ['--pr-rule' as any]: '#2A241D',
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--pr-canvas)',
        color: 'var(--pr-ink)',
        fontFamily: 'var(--font-pr-body)',
        overflow: 'hidden',
      }}
    >
      {/* PAPER GRAIN — SVG noise at 3% opacity, baked into the background
          via a fixed pseudo-pattern. Gives the canvas a film texture
          without competing with content. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          pointerEvents: 'none',
        }}
      />

      {/* RADIAL VIGNETTE — concentrates light center-left where the
          headline lives. Subtle, ~10% darker at edges. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(232,160,74,0.04) 0%, transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* SIGNATURE AMBER VERTICAL RULE — drops through the composition at
          column 9 of a 12-grid. Anchors layout. 1px wide, 60% opacity. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '66%',
          width: 1,
          background: 'var(--pr-amber)',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      <BackBar />

      <article
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 48px',
          minHeight: 'calc(100vh - 56px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'auto 1fr auto',
          gap: '0 32px',
        }}
      >
        {/* MASTHEAD ROW — top of the spread. Newspaper-tier metadata strip. */}
        <header
          style={{
            gridColumn: '1 / -1',
            gridRow: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 56,
            paddingBottom: 40,
            borderBottom: '1px solid var(--pr-rule)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <span
              style={{
                fontFamily: 'var(--font-pr-editorial)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: '-0.01em',
                color: 'var(--pr-ink)',
              }}
            >
              CasePad
            </span>
            <span
              style={{
                fontFamily: 'var(--font-pr-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pr-ink-3)',
              }}
            >
              Issue 01 · {TODAY}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span
              style={{
                fontFamily: 'var(--font-pr-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pr-ink-3)',
              }}
            >
              Daily Practice Edition
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--pr-amber)',
                boxShadow: '0 0 12px var(--pr-amber)',
                display: 'inline-block',
              }}
              aria-label="Live"
            />
          </div>
        </header>

        {/* MAIN HEADLINE — column 1 to 8. Tiempos-style display serif at
            massive size, italic on a single signature word. */}
        <section
          style={{
            gridColumn: '1 / span 8',
            gridRow: 2,
            paddingTop: 80,
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--pr-amber)',
              marginBottom: 36,
            }}
          >
            <span style={{ marginRight: 12 }}>—</span>The Room Before the Room
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-pr-editorial)',
              fontWeight: 400,
              fontSize: 'clamp(48px, 7vw, 104px)',
              lineHeight: 0.96,
              letterSpacing: '-0.025em',
              color: 'var(--pr-ink)',
              marginBottom: 48,
              maxWidth: '14ch',
            }}
          >
            Practice the case{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--pr-amber)' }}>
              before
            </em>{' '}
            the partner asks the question.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-pr-body)',
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.55,
              color: 'var(--pr-ink-2)',
              maxWidth: '52ch',
              marginBottom: 56,
            }}
          >
            An interviewer who pushes back. A debrief that names what you missed
            and why. A streak that tracks whether you came back.
          </p>

          {/* EDITORIAL FIGURES ROW — three numbers as the visual anchor.
              Mono numerals at deliberate sizing, paired with attribution
              microtype. Numbers are the kings of this surface. */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, max-content)',
              gap: 64,
              alignItems: 'baseline',
              borderTop: '1px solid var(--pr-rule)',
              paddingTop: 32,
              maxWidth: 600,
            }}
          >
            <Figure value="1,165" caption="real cases" detail="Harvard · Bain · Wharton" />
            <Figure value="6 wks" caption="to interview" detail="The window matters" />
            <Figure value="04" caption="min/drill" detail="Daily-loop minimum" />
          </div>
        </section>

        {/* SIGNIN PANEL — column 10 to 12. Tucked, minimal, tall.
            Single email input, one button. Quote attribution above. */}
        <aside
          style={{
            gridColumn: '10 / -1',
            gridRow: 2,
            paddingTop: 80,
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <blockquote
            style={{
              fontFamily: 'var(--font-pr-editorial)',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 19,
              lineHeight: 1.4,
              color: 'var(--pr-ink-2)',
              marginBottom: 18,
              borderLeft: '1px solid var(--pr-amber)',
              paddingLeft: 16,
            }}
          >
            “Reps in the silence pay off in the room.”
          </blockquote>
          <cite
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--pr-ink-3)',
              marginBottom: 56,
              fontStyle: 'normal',
            }}
          >
            — Ash, EM at Bain
          </cite>

          <p
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 10,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'var(--pr-ink-3)',
              marginBottom: 14,
            }}
          >
            Cohort sign-in
          </p>
          <input
            type="email"
            placeholder="you@school.edu"
            style={{
              width: '100%',
              padding: '14px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--pr-rule)',
              fontFamily: 'var(--font-pr-body)',
              fontSize: 16,
              color: 'var(--pr-ink)',
              outline: 'none',
              marginBottom: 24,
            }}
          />
          <button
            type="button"
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 11,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              fontWeight: 500,
              color: 'var(--pr-canvas)',
              background: 'var(--pr-amber)',
              border: 'none',
              padding: '12px 22px',
              cursor: 'pointer',
              transition: 'opacity 180ms',
            }}
          >
            Enter →
          </button>
          <p
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pr-ink-3)',
              marginTop: 16,
            }}
          >
            Allowlist only · No password
          </p>
        </aside>

        {/* FOOTER — bottom strip. Attribution + asterisk as silent
            editorial signature in bottom-left corner. */}
        <footer
          style={{
            gridColumn: '1 / -1',
            gridRow: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 32,
            paddingBottom: 36,
            borderTop: '1px solid var(--pr-rule)',
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            {/* The asterisk — typographic mark, not a 3D character.
                Newsreader serif glyph, baseline-aligned. The silent
                editorial signature. */}
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-pr-editorial)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 32,
                color: 'var(--pr-amber)',
                lineHeight: 0.7,
              }}
            >
              *
            </span>
            <span
              style={{
                fontFamily: 'var(--font-pr-mono)',
                fontSize: 9,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'var(--pr-ink-3)',
              }}
            >
              MMXXVI · Cohort One · SSB Scaler
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-pr-mono)',
              fontSize: 9,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'var(--pr-ink-3)',
            }}
          >
            Read · /terms
          </span>
        </footer>
      </article>
    </main>
  );
}

// ---- Figure (number + caption + detail) -------------------------------
// Editorial figure block — large mono numeral, small caption underneath,
// micro-detail line below. Used for the 3-up stat row that visually
// anchors the spread.
function Figure({ value, caption, detail }: { value: string; caption: string; detail: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-pr-mono)',
          fontWeight: 500,
          fontSize: 36,
          letterSpacing: '-0.02em',
          color: 'var(--pr-ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-pr-body)',
          fontWeight: 500,
          fontSize: 12,
          color: 'var(--pr-ink-2)',
          marginBottom: 4,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-pr-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--pr-ink-3)',
        }}
      >
        {detail}
      </div>
    </div>
  );
}

// ---- BackBar ----------------------------------------------------------
function BackBar() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        padding: '16px 48px',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <a
        href="/design-lab"
        style={{
          fontFamily: 'var(--font-pr-mono)',
          fontSize: 9,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'var(--pr-ink-3)',
          textDecoration: 'none',
        }}
      >
        ← Design Lab · Practice Room
      </a>
    </div>
  );
}
