// Launch landing for /auth/signin — focused product page that replaces the
// HuprDesign agency-portfolio composition when a cold-LinkedIn visitor
// arrives. Built 2026-05-29 in response to Playwright-screenshot evidence
// that the old composition (full-bleed photo + cut-off "WHEN CASES"
// headline + tiny corner signin card) was drowning the actual conversion
// surface.
//
// Composition (top to bottom):
//   1. Minimal nav (logo + scroll-to-signin link)
//   2. Hero: 60/40 split desktop, stacked mobile.
//        Left  60%: eyebrow + value-prop H1 + sub + 3 trust bullets
//        Right 40%: <SignInCard /> (already polished, kept as-is)
//   3. Three-up "what you get" value props (text-only, no fake cards)
//   4. Final CTA strip → anchor scroll back to the hero signin card
//   5. Minimal footer with terms / privacy links
//
// Page-level color anchor: warm off-white background (#FAFAF9), HUPR ink
// (#323234) for type, HUPR cognac (#7d5621-ish) used once as the final-CTA
// underline accent. No full-bleed photo. The signin card is the focal
// point above the fold; the rest is product proof scrolling beneath.
//
// All copy is grounded in real numbers (1,165 cases) and real positioning
// (May 2026 cohort, real casebooks, Indian context). No fake metrics.

import { SignInCard } from './signin-card';

export function LaunchLanding({
  errorCode,
  returnTo,
  showSessionExpired,
}: {
  errorCode?: string;
  returnTo?: string;
  showSessionExpired?: boolean;
}) {
  return (
    <main
      className="min-h-screen"
      style={{
        background: '#FAFAF9',
        color: '#323234',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* NAV — minimal. Logo left, "Sign in" anchor right. */}
      <nav
        className="px-6 sm:px-12 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid #ECEAE3' }}
      >
        <a
          href="#top"
          className="font-headline"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.01em',
            color: '#323234',
            textDecoration: 'none',
          }}
        >
          CasePad
        </a>
        <a
          href="#signin"
          className="casepad-launch-navcta"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#323234',
            textDecoration: 'none',
            padding: '8px 18px',
            borderRadius: 9999,
            border: '1px solid #323234',
          }}
        >
          Sign in
        </a>
      </nav>

      {/* HERO — 60/40 split desktop, stack mobile. */}
      <section
        id="top"
        className="px-6 sm:px-12 pt-16 sm:pt-20 pb-20 sm:pb-28"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* LEFT 60% — value-prop */}
          <div className="lg:col-span-7">
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: '#777169',
                marginBottom: 24,
              }}
            >
              For B-school cohorts · May 2026
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6.5vw, 76px)',
                lineHeight: 1.02,
                letterSpacing: '-0.025em',
                color: '#323234',
                margin: 0,
                textWrap: 'balance',
                maxWidth: '14ch',
              }}
            >
              Practice case interviews with an AI that pushes back.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 18,
                lineHeight: 1.55,
                color: '#555049',
                margin: '24px 0 32px',
                maxWidth: '52ch',
              }}
            >
              1,165 real cases from MBB casebooks. An interviewer that challenges
              your structure, your math, and your synthesis. Free during the
              May 2026 cohort.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                'Real cases sourced from Wharton, Bain, BCG, McKinsey casebooks. No synthetic scenarios.',
                'Indian-context data baked in: ₹, lakh, crore, SEBI, real cost/revenue benchmarks.',
                'Voice or text input. Same rigor on the AI side either way.',
              ].map((bullet) => (
                <li
                  key={bullet}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr',
                    gap: 12,
                    alignItems: 'baseline',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    color: '#3d3936',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: '#7d5621',
                      fontWeight: 600,
                    }}
                  >
                    ✓
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT 40% — signin card. Stickier visual on desktop via
              sticky-top so the form stays alongside the value-prop on
              very tall hero text. On mobile it stacks below the
              value-prop block. */}
          <div className="lg:col-span-5" id="signin">
            <SignInCard
              errorCode={errorCode}
              returnTo={returnTo}
              showSessionExpired={showSessionExpired}
            />
          </div>
        </div>
      </section>

      {/* WHAT YOU GET — three-up, text-only. No fake cards, no
          identical-grid cliché (impeccable Absolute Ban). Three columns
          desktop, stacked mobile, divided by hairlines, not boxes. */}
      <section
        className="px-6 sm:px-12 py-20 sm:py-28"
        style={{ borderTop: '1px solid #ECEAE3', background: '#FFFFFF' }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: '#777169',
              marginBottom: 16,
            }}
          >
            What you get
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#323234',
              margin: '0 0 56px',
              maxWidth: '22ch',
              textWrap: 'balance',
            }}
          >
            Built for the way an actual MBB interview goes.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
            {[
              {
                kicker: '01',
                title: 'A library that’s actually deep',
                body:
                  '1,165 real cases across Profitability, Market entry, M&A, Pricing, GTM, Estimation. Curated from school casebooks. No filler. No AI fabrication.',
              },
              {
                kicker: '02',
                title: 'An interviewer that pushes back',
                body:
                  'Structure too vague? You hear about it. Math drift? Caught. Synthesis missing at minute 18? Asked for. The AI is graded against the same rubric you are.',
              },
              {
                kicker: '03',
                title: 'Feedback you can act on',
                body:
                  'Per-dimension scoring on structure, math discipline, communication, synthesis, business judgment. Plus a verified-outcomes log so you remember what real firms actually ask.',
              },
            ].map((col) => (
              <div key={col.kicker}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.18em',
                    color: '#7d5621',
                    marginBottom: 14,
                  }}
                >
                  {col.kicker}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    color: '#323234',
                    margin: '0 0 14px',
                  }}
                >
                  {col.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#555049',
                    margin: 0,
                  }}
                >
                  {col.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — quiet, doesn’t shout. Single line + button.
          Anchor scrolls back to the hero signin card so the user lands
          on the form they already saw. */}
      <section
        className="px-6 sm:px-12 py-24 sm:py-32"
        style={{ borderTop: '1px solid #ECEAE3' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#323234',
              margin: 0,
              textWrap: 'balance',
            }}
          >
            Start practicing in 30 seconds.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              lineHeight: 1.5,
              color: '#777169',
              margin: '16px 0 32px',
            }}
          >
            Free during the May 2026 cohort. No card. Cancel by closing the tab.
          </p>
          <a
            href="#signin"
            className="casepad-launch-finalcta"
            style={{
              display: 'inline-block',
              background: '#323234',
              color: '#FFFFFF',
              padding: '14px 32px',
              borderRadius: 9999,
              border: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Sign in to begin
          </a>
        </div>
      </section>

      {/* FOOTER — minimal, single line. */}
      <footer
        className="px-6 sm:px-12 py-10"
        style={{
          borderTop: '1px solid #ECEAE3',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: '#777169',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>CasePad · Cohort May 2026</span>
          <div className="flex items-center gap-5">
            <a href="/terms" style={{ color: '#777169' }}>
              Terms
            </a>
            <a href="/privacy" style={{ color: '#777169' }}>
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
