// Edition — the post-research $100k attempt for /signin
//
// Brief synthesized from 4 research agents (typography/color, motion,
// Awwwards $100k teardowns, educational product comparators):
//
//   Mood:       Quiet practice room. Granola's calm + MasterClass editorial
//               typography + Brilliant's daily-loop discipline + LeetCode's
//               percentile honesty.
//   Concept:    "Each case is a numbered edition." Frontispiece on open.
//               Treat /cases as a navigable archive (Tracing Art / Renaissance
//               Edition pattern). Volume / Edition / Year masthead.
//   Canvas:     #FAF7F2 cream — every daily-active educational comparator
//               (Brilliant, Synthesis, Aceable, Granola) chose cream. Pure
//               white reads "default", pure black reads "passive media".
//   Accent:     ONE color: #1E3A5F deep ink-blue. Reads "consulting deck" /
//               "FT salmon's older sibling". Used <5% of pixels.
//   Type:       Fraunces variable (opsz 9-144, WONK 0, SOFT 30) for editorial
//               display. Geist Sans for body/UI. JetBrains Mono for tabular
//               numerals + edition-numbering / metadata.
//   Texture:    8% SVG grain overlay, blend `multiply` on cream.
//   Motion:     One pulsing ink-blue dot (live signal). Restraint.
//   Asterisk:   Demoted to a Fraunces-italic typographic mark in the
//               masthead. Editorial signature, not 3D character.
//
// What separates this from prior amateur attempts:
//   1. Two-color discipline (cream + ink-blue ONLY — every $100k Awwwards
//      site verified uses exactly two colors)
//   2. Variable font with explicit opsz axis (Fraunces opsz=144 at hero,
//      opsz=14 at body — the most common $100k tell that amateurs miss)
//   3. Tabular numerals on every number — JetBrains Mono with
//      font-variant-numeric: tabular-nums
//   4. Editorial composition (12-col newspaper grid, asymmetric) NOT a
//      Bento dashboard
//   5. Hero number as visual anchor (1,165) at display weight, opsz=144
//   6. Edition framing: "Volume I · Edition One · MMXXVI"
//   7. Quote-and-cite treatment for Ash's voice (Granola's slab-serif-as-
//      character pattern)
//   8. SVG grain at 8% with multiply blend (Granola's warmth recipe)

import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

// Fraunces variable — opsz axis is the load-bearing premium-craft signal.
// Amateurs use one master rendered at all sizes; opsz lets ONE face do
// display + body work that would take 3 faces in a static system.
// Fraunces variable — no `weight` because variable fonts cover the full
// weight range via font-variation-settings. Specifying both `weight` and
// `axes` conflicts in next/font/google. Style normal+italic, axes for
// optical sizing (opsz), softness (SOFT), and the WONK axis that gives
// Fraunces its editorial bite.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ed-display',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
});
const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ed-body',
  weight: ['400', '500', '600'],
});
const jbm = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ed-mono',
  weight: ['400', '500'],
});

export const metadata = {
  title: 'Design Lab — Edition (the post-research attempt)',
  robots: { index: false },
};

const TODAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());

export default async function EditionPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`edition-scope ${fraunces.variable} ${geist.variable} ${jbm.variable}`}
      style={{
        ['--ed-canvas' as any]: '#FAF7F2',
        ['--ed-paper' as any]: '#FFFFFF',
        ['--ed-ink' as any]: '#1A1612',
        ['--ed-ink-2' as any]: '#4A453E',
        ['--ed-ink-3' as any]: '#9A938A',
        ['--ed-rule' as any]: '#D9D2C5',
        ['--ed-rule-strong' as any]: '#5A5249',
        ['--ed-accent' as any]: '#1E3A5F',
        ['--ed-accent-deep' as any]: '#162A45',
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--ed-canvas)',
        color: 'var(--ed-ink)',
        fontFamily: 'var(--font-ed-body)',
        // Geist OpenType features — `cv11` swaps to single-storey g, `ss01`
        // alternate forms. Stops Geist from reading "default Vercel template".
        fontFeatureSettings: '"ss01", "cv11", "calt"',
        overflow: 'hidden',
      }}
    >
      {/* PAPER GRAIN — 8% SVG noise on cream, multiply blend. Granola's
          warmth recipe. Higher opacity than dark mode (cream needs more
          to register; 4% on dark = 8% on cream visually). */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.08,
          mixBlendMode: 'multiply',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          pointerEvents: 'none',
        }}
      />

      <BackBar />

      <article
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 56px',
          minHeight: 'calc(100vh - 64px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'auto 1fr auto',
          gap: '0 32px',
        }}
      >
        {/* MASTHEAD — newspaper-tier metadata strip with edition numbering */}
        <header
          style={{
            gridColumn: '1 / -1',
            gridRow: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 64,
            paddingBottom: 32,
            borderBottom: '1px solid var(--ed-rule-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
            {/* Wordmark — Fraunces italic, opsz tuned for display */}
            <span
              style={{
                fontFamily: 'var(--font-ed-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 30,
                letterSpacing: '-0.015em',
                color: 'var(--ed-ink)',
                fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0',
                lineHeight: 1,
              }}
            >
              CasePad
            </span>
            {/* Edition numbering — JetBrains Mono tabular */}
            <span
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Volume I · Edition One · MMXXVI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
              }}
            >
              {TODAY} · Cohort One
            </span>
            {/* Live pulse dot — the ONE motion element on the page. The
                cream canvas + ink-blue pulse = "the day is open, we are
                live, and this is a publication". Pure CSS animation. */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--ed-accent)',
                animation: 'edition-pulse 2.8s ease-in-out infinite',
                boxShadow: '0 0 0 0 var(--ed-accent)',
                display: 'inline-block',
              }}
              aria-label="Live"
            />
            <style>{`
              @keyframes edition-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(30,58,95,0.45); }
                50%      { box-shadow: 0 0 0 8px rgba(30,58,95,0); }
              }
              @media (prefers-reduced-motion: reduce) {
                .edition-scope [aria-label="Live"] { animation: none !important; }
              }
            `}</style>
          </div>
        </header>

        {/* MAIN BODY — newspaper spread. Left 8 cols = headline / kicker /
            stat trio. Right 4 cols = quote + signin. */}
        <section
          style={{
            gridColumn: '1 / span 8',
            gridRow: 2,
            paddingTop: 120,
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          {/* Kicker — Geist tracked, accent color, single hairline rule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 56,
            }}
          >
            <span
              style={{
                width: 24,
                height: 1,
                background: 'var(--ed-accent)',
                display: 'inline-block',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--ed-accent)',
                fontWeight: 500,
                margin: 0,
              }}
            >
              The Practice Room — Manifesto
            </p>
          </div>

          {/* HEADLINE — Fraunces variable at opsz 144 for display crispness.
              The italic on "before" is the editorial signature. */}
          <h1
            style={{
              fontFamily: 'var(--font-ed-display)',
              fontWeight: 400,
              fontSize: 'clamp(56px, 7.5vw, 124px)',
              lineHeight: 0.92,
              letterSpacing: '-0.025em',
              color: 'var(--ed-ink)',
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0',
              marginBottom: 64,
              maxWidth: '11ch',
            }}
          >
            Practice the case{' '}
            <em
              style={{
                fontStyle: 'italic',
                fontWeight: 300,
                fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
              }}
            >
              before
            </em>{' '}
            the partner asks.
          </h1>

          {/* SUBHEAD — Geist regular, restrained, set narrow */}
          <p
            style={{
              fontFamily: 'var(--font-ed-body)',
              fontWeight: 400,
              fontSize: 18,
              lineHeight: 1.55,
              color: 'var(--ed-ink-2)',
              maxWidth: '46ch',
              marginBottom: 88,
            }}
          >
            An interviewer who pushes back. A debrief that names what you
            missed, and why. A streak that tracks whether you came back.
          </p>

          {/* THREE EDITORIAL FIGURES — visual anchor of the page. JetBrains
              Mono tabular at 64px. Numbers are kings of this surface. */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, max-content)',
              gap: 88,
              alignItems: 'baseline',
              borderTop: '1px solid var(--ed-rule)',
              paddingTop: 36,
              maxWidth: 760,
            }}
          >
            <Figure
              value="1,165"
              caption="real cases"
              detail="Harvard · Bain · Wharton · Ivey"
            />
            <Figure
              value="6 wks"
              caption="to interview"
              detail="The window matters."
            />
            <Figure
              value="04"
              caption="min, daily drill"
              detail="The minimum that compounds."
            />
          </div>
        </section>

        {/* RIGHT COLUMN — quote + signin, tucked at column 9-12 */}
        <aside
          style={{
            gridColumn: '9 / -1',
            gridRow: 2,
            paddingTop: 120,
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderLeft: '1px solid var(--ed-rule)',
            paddingLeft: 56,
          }}
        >
          {/* Pull-quote — Granola's slab-serif-as-character treatment */}
          <div style={{ marginBottom: 80 }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-ed-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 88,
                lineHeight: 0.6,
                color: 'var(--ed-accent)',
                fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
                display: 'block',
                marginBottom: -10,
              }}
            >
              “
            </span>
            <blockquote
              style={{
                fontFamily: 'var(--font-ed-display)',
                fontWeight: 400,
                fontSize: 22,
                lineHeight: 1.3,
                color: 'var(--ed-ink)',
                fontVariationSettings: '"opsz" 32, "SOFT" 30, "WONK" 0',
                margin: 0,
                marginBottom: 16,
                maxWidth: '24ch',
              }}
            >
              Reps in the silence pay off in the room.
            </blockquote>
            <cite
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
                fontStyle: 'normal',
              }}
            >
              — Ash, EM at Bain
            </cite>
          </div>

          {/* Signin — minimal, no card chrome. The eye should not see this
              as a "form" — it should read as a back-of-the-magazine reply
              card. Subtle hairline rules, no border-radius extravagance. */}
          <div style={{ width: '100%', maxWidth: 320 }}>
            <p
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 10,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              Cohort sign-in
            </p>
            <input
              type="email"
              placeholder="you@school.edu"
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--ed-rule-strong)',
                fontFamily: 'var(--font-ed-body)',
                fontSize: 16,
                color: 'var(--ed-ink)',
                outline: 'none',
                marginBottom: 24,
              }}
            />
            <button
              type="button"
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 11,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                fontWeight: 500,
                color: 'var(--ed-canvas)',
                background: 'var(--ed-accent)',
                border: 'none',
                padding: '14px 28px',
                cursor: 'pointer',
                transition: 'background 200ms cubic-bezier(0.12, 0, 0.08, 1)',
              }}
            >
              Enter the room →
            </button>
            <p
              style={{
                fontFamily: 'var(--font-ed-mono)',
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
                marginTop: 20,
              }}
            >
              Allowlist only · No password
            </p>
          </div>
        </aside>

        {/* COLOPHON FOOTER — newspaper print-shop attribution. Asterisk is
            the silent editorial signature, set as a Fraunces italic glyph,
            ink-blue tinted. */}
        <footer
          style={{
            gridColumn: '1 / -1',
            gridRow: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingTop: 40,
            paddingBottom: 36,
            borderTop: '1px solid var(--ed-rule-strong)',
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-ed-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 44,
                color: 'var(--ed-accent)',
                lineHeight: 0.6,
                fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
              }}
            >
              *
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-ed-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ed-ink-2)',
                  fontWeight: 500,
                }}
              >
                Set in Fraunces &amp; Geist
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ed-mono)',
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--ed-ink-3)',
                }}
              >
                Cohort One · SSB Scaler · MMXXVI
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            {[
              ['/terms', 'Terms'],
              ['/how-it-works', 'How it works'],
              ['mailto:ash@casepad', 'Editor'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--font-ed-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ed-ink-2)',
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </footer>
      </article>
    </main>
  );
}

// Editorial figure block — large mono numeral as the visual anchor + 2-line
// caption + detail. Tabular-nums is non-negotiable for $100k craft (numbers
// that jitter as values change is the #1 amateur tell on data UIs).
function Figure({ value, caption, detail }: { value: string; caption: string; detail: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-ed-mono)',
          fontWeight: 500,
          fontSize: 64,
          letterSpacing: '-0.025em',
          color: 'var(--ed-ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 0.95,
          marginBottom: 14,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ed-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 16,
          color: 'var(--ed-ink-2)',
          fontVariationSettings: '"opsz" 24, "SOFT" 30, "WONK" 0',
          marginBottom: 6,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ed-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ed-ink-3)',
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function BackBar() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        padding: '20px 56px',
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <a
        href="/design-lab"
        style={{
          fontFamily: 'var(--font-ed-mono)',
          fontSize: 10,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'var(--ed-ink-3)',
          textDecoration: 'none',
          pointerEvents: 'auto',
        }}
      >
        ← Design Lab · Edition
      </a>
    </div>
  );
}
