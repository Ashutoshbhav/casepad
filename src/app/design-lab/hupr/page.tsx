// /design-lab/hupr — actual HUPR adaptation.
//
// Tokens forensically extracted from hupr.ca's main.css on 2026-05-06.
// NOT a synthesis — uses HUPR's verified values: white canvas,
// #323234 ink, no accent color, Montserrat + IBM Plex Mono +
// Moderustic, photo-led hero, 3-card service grid, dark footer.
//
// HUPR's actual section sequence (from the live site):
//   1. Header / nav (logo + text menu + language toggle)
//   2. Full-bleed hero — three stacked landscape photos
//   3. Tagline statement (mixed case)
//   4. Service overview (3 cards: research / knowledge / support)
//   5. Highlights carousel
//   6. About section
//   7. Spheres of innovation (4 expandable categories)
//   8. News carousel
//   9. Footer (dark #323234 + white text)
//
// CasePad's adaptation maps cohort case-prep onto HUPR's structure:
//   • Tagline → "The room before the room."
//   • 3 service cards → 3 case-prep tracks (Solve / Drill / Debrief)
//   • Spheres of innovation → 4 case-method principles
//   • News → cohort updates / latest casebook ingests
//   • Photos → empty boardroom shots (Unsplash, no model release issue)

import { IBM_Plex_Mono, Montserrat, Moderustic } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';
import { COLORS, FONTS, RADIUS } from './_components/tokens';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-body',
  weight: ['400', '500', '700'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-display',
  weight: ['300', '400', '500', '600', '700'],
});
const moderustic = Moderustic({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-accent',
  weight: ['300', '400', '500', '600'],
});

export const metadata = {
  title: 'Design Lab · HUPR adaptation',
  robots: { index: false },
};

const PHOTOS = [
  // Three empty-boardroom shots — Unsplash, free for commercial use.
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=2400&q=80',
];

const TRACKS = [
  {
    label: 'Solve',
    note: 'Live case interviews with Ash, your AI engagement manager. 1,165 real cases across consulting, IB, PM, marketing, and strategy tracks.',
  },
  {
    label: 'Drill',
    note: 'Targeted reps on the muscle that gave way last time. Math, structure, behavioral — short, sharp, repeatable.',
  },
  {
    label: 'Debrief',
    note: 'Score, walkthrough, ideal structure tree. Every rep ends with a written take so the lesson lands before the next case.',
  },
];

const PRINCIPLES = [
  { label: 'Structure', note: 'MECE first. Branches before details.' },
  { label: 'Insight',   note: 'Hypothesis-led, data-supported.' },
  { label: 'Speed',     note: 'Within window, decisive, precise.' },
  { label: 'Voice',     note: 'Calm under pressure. Cohort-tested.' },
];

export default async function HuprPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`${plexMono.variable} ${montserrat.variable} ${moderustic.variable}`}
      style={{
        minHeight: '100vh',
        background: COLORS.canvas,
        color: COLORS.text,
        fontFamily: FONTS.body,
      }}
    >
      {/* ── 1. HEADER / NAV — minimal text menu, no hamburger on desktop ── */}
      <header
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.01em',
            color: COLORS.text,
          }}
        >
          CasePad
        </div>
        <nav
          style={{
            display: 'flex',
            gap: 32,
            fontFamily: FONTS.body,
            fontSize: 13,
            color: COLORS.textMuted,
          }}
        >
          <a href="#how" style={{ color: COLORS.text, textDecoration: 'none' }}>How it works</a>
          <a href="#tracks" style={{ color: COLORS.text, textDecoration: 'none' }}>Tracks</a>
          <a href="#cohort" style={{ color: COLORS.text, textDecoration: 'none' }}>Cohort</a>
          <a href="/design-lab" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>↩ Lab</a>
        </nav>
      </header>

      {/* ── 2. HERO — three stacked landscape photos, full-bleed ── */}
      <section style={{ padding: '40px 0 80px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              aspectRatio: '3 / 1',
            }}
          >
            {PHOTOS.map((url) => (
              <div
                key={url}
                aria-hidden="true"
                style={{
                  background: `url(${url}) center/cover no-repeat`,
                  filter: 'saturate(0.92) brightness(0.92)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. TAGLINE — mixed case, large but not billboard ── */}
      <section
        id="how"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '60px 32px 100px',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 48,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            fontFamily: FONTS.accent,
            fontWeight: 400,
            fontSize: 13,
            letterSpacing: '0.04em',
            color: COLORS.textMuted,
          }}
        >
          ABOUT CASEPAD
        </div>
        <div>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 'clamp(36px, 4.5vw, 64px)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              color: COLORS.text,
              margin: 0,
              maxWidth: '22ch',
            }}
          >
            The room before the room.
          </h1>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: 17,
              lineHeight: 1.65,
              color: COLORS.textMuted,
              maxWidth: '60ch',
              marginTop: 32,
            }}
          >
            Live case interview practice with Ash — an AI engagement manager
            trained on 1,165 real consulting, IB, PM, marketing, and strategy
            cases. Not a casebook. Not a chatbot. A rehearsal room. Show up
            daily; the muscle builds itself.
          </p>
        </div>
      </section>

      {/* ── 4. THREE TRACK CARDS (HUPR's "service overview" pattern) ── */}
      <section
        id="tracks"
        style={{
          background: COLORS.sunken,
          padding: '80px 0',
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            padding: '0 32px',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.accent,
              fontWeight: 400,
              fontSize: 13,
              letterSpacing: '0.04em',
              color: COLORS.textMuted,
              marginBottom: 16,
            }}
          >
            THREE LOOPS
          </div>
          <h2
            style={{
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 'clamp(28px, 3.2vw, 44px)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              color: COLORS.text,
              margin: 0,
              marginBottom: 56,
              maxWidth: '20ch',
            }}
          >
            Solve a case. Drill the gap. Debrief in the open.
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {TRACKS.map((t, i) => (
              <article
                key={t.label}
                style={{
                  background: COLORS.canvas,
                  padding: 32,
                  borderRadius: RADIUS.cards,
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    color: COLORS.textMuted,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 600,
                    fontSize: 28,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                    color: COLORS.text,
                    margin: 0,
                  }}
                >
                  {t.label}
                </h3>
                <p
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: COLORS.textMuted,
                    margin: 0,
                  }}
                >
                  {t.note}
                </p>
                <a
                  href="#"
                  style={{
                    marginTop: 'auto',
                    fontFamily: FONTS.body,
                    fontSize: 13,
                    color: COLORS.text,
                    textDecoration: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  Learn more →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRINCIPLES (HUPR's "spheres of innovation" pattern) ── */}
      <section
        id="cohort"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '100px 32px',
        }}
      >
        <div
          style={{
            fontFamily: FONTS.accent,
            fontWeight: 400,
            fontSize: 13,
            letterSpacing: '0.04em',
            color: COLORS.textMuted,
            marginBottom: 16,
          }}
        >
          THE SCORING RUBRIC
        </div>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 'clamp(28px, 3.2vw, 44px)',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: COLORS.text,
            margin: 0,
            marginBottom: 56,
            maxWidth: '24ch',
          }}
        >
          Four dimensions, scored on every rep.
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 0,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.label}
              style={{
                padding: 32,
                borderRight:
                  i < PRINCIPLES.length - 1
                    ? `1px solid ${COLORS.border}`
                    : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 200,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: COLORS.textMuted,
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: '-0.01em',
                  color: COLORS.text,
                  marginTop: 'auto',
                }}
              >
                {p.label}
              </div>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                {p.note}
              </p>
              <span
                aria-hidden="true"
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 14,
                  color: COLORS.text,
                  marginTop: 8,
                }}
              >
                →
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. CTA STRIP — single-line invitation, no decoration ── */}
      <section
        style={{
          background: COLORS.canvas,
          borderTop: `1px solid ${COLORS.border}`,
          padding: '80px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 'clamp(24px, 2.6vw, 36px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: COLORS.text,
              margin: 0,
              maxWidth: '24ch',
            }}
          >
            Show up daily. The muscle builds itself.
          </h2>
          <a
            href="/auth/signin"
            style={{
              background: COLORS.inverse,
              color: COLORS.textOnDark,
              padding: '16px 32px',
              fontFamily: FONTS.body,
              fontSize: 14,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              borderRadius: RADIUS.buttons,
              border: 'none',
            }}
          >
            Sign in →
          </a>
        </div>
      </section>

      {/* ── 7. FOOTER — dark #323234 with white text, HUPR's exact pattern ── */}
      <footer
        style={{
          background: COLORS.inverse,
          color: COLORS.textOnDark,
          padding: '64px 32px 40px',
        }}
      >
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 48,
              paddingBottom: 48,
              borderBottom: `1px solid ${COLORS.borderOnDark}`,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 700,
                  fontSize: 22,
                  marginBottom: 16,
                }}
              >
                CasePad
              </div>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.65)',
                  maxWidth: '32ch',
                }}
              >
                The rehearsal room for case interviews. Cohort-only,
                allowlist-gated.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  marginBottom: 16,
                }}
              >
                Product
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Solve', 'Drill', 'Debrief', 'Library'].map((l) => (
                  <li key={l} style={{ fontFamily: FONTS.body, fontSize: 13 }}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{l}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  marginBottom: 16,
                }}
              >
                Cohort
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['About', 'Allowlist', 'Terms', 'Contact'].map((l) => (
                  <li key={l} style={{ fontFamily: FONTS.body, fontSize: 13 }}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div
            style={{
              paddingTop: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              © 2026 CasePad. Cohort-only.
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              EN · FR
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
