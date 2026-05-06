// /design-lab/v2/debrief — HUPR-flavor case debrief
//
// HUGE editorial number reveal as the centerpiece (the score),
// 3-up sub-scores in Plex Mono tabular, walkthrough as Plex Mono
// paragraphs with Montserrat 700 subheads, tomorrow's case card
// on the right.

import { IBM_Plex_Mono, Montserrat, Fraunces } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
import { Masthead, SectionEyebrow, Marquee } from '../_components/masthead';
import { SketchyUnderline, SketchyProgressBar, SketchyLine } from '../_components/sketchy';

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
// refero: mercury / legora / public — light-weight serif at huge
// size for tabular display moments. Free Google substitute for
// Mercury arcadiaDisplay 360 / Legora Rhymes Display Light /
// Public Denton 300. Used on the score numeral, sub-score values,
// and tomorrow's case headline.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v2-serif',
  weight: ['300', '400'],
  style: ['normal', 'italic'],
});

export const metadata = {
  title: 'Design Lab v2 — Debrief',
  robots: { index: false },
};

export default async function DebriefV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-debrief-scope ${plexMono.variable} ${montserrat.variable} ${fraunces.variable}`}
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
      }}
    >
      <Masthead caption={['Debrief ·', 'Case', 'Nº0427']} />
      <SectionEyebrow label="Debrief · Coffee chain profitability" meta="completed · 22 min · 06 turns" />

      {/* SCORE REVEAL — massive number as the centerpiece */}
      <section style={{ padding: '120px 36px 60px', maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(50,50,52,0.6)',
            marginBottom: 40,
          }}
        >
          Your score · out of 100
        </p>
        <div
          style={{
            // refero: mercury / legora — light-weight serif at huge
            // size on the score numeral. Replaces Montserrat 700.
            // Whisper-confidence instead of shout-confidence.
            fontFamily: 'var(--font-v2-serif)',
            fontWeight: 300,
            fontSize: 'clamp(160px, 32vw, 480px)',
            lineHeight: 0.85,
            letterSpacing: '-0.04em',
            color: 'rgb(50,50,52)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          78
        </div>
        {/* Sketchy underline — bigger one for the score reveal moment */}
        <div
          style={{
            width: 'min(280px, 22vw)',
            margin: '4px auto 0',
          }}
        >
          {/* refero: delphi — Fire Opal #f65726 sketchy underline
              beneath the score. Score reveal IS the headline-emphasis
              moment Delphi reserves Fire Opal for. The single chromatic
              punctuation on this whole surface. */}
          <SketchyUnderline
            strokeWidth={6}
            roughness={2.6}
            bowing={5}
            stroke="#f65726"
          />
        </div>
        <p
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontStyle: 'normal',
            fontWeight: 500,
            fontSize: 'clamp(20px, 2.4vw, 30px)',
            lineHeight: 1.3,
            color: 'rgba(50,50,52,0.8)',
            marginTop: 32,
            maxWidth: '32ch',
            marginLeft: 'auto',
            marginRight: 'auto',
            letterSpacing: '-0.005em',
          }}
        >
          Sharper than yesterday. You held structure under pressure on turn 5.
        </p>
      </section>

      {/* 3-UP SUB-SCORES — Plex Mono tabular */}
      <section style={{ padding: '40px 36px 80px', maxWidth: 1400, margin: '0 auto' }}>
        <SectionEyebrow label="Breakdown" meta="structure · insight · speed" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            paddingTop: 48,
          }}
        >
          {[
            // Each sub-score gets its own meaning-colour for the bar:
            //   Structure → orange (the active work / structure muscle)
            //   Insight   → Aether Blue (wisdom, depth, considered)
            //   Speed     → Fire Opal (urgency, time)
            { label: 'Structure', value: 32, max: 40, note: 'MECE held',          fill: '#f54e00' },
            { label: 'Insight',   value: 30, max: 40, note: 'good cost-mix call', fill: '#5e6ad2' },
            { label: 'Speed',     value: 16, max: 20, note: 'within window',      fill: '#f65726' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '32px 32px 28px',
                borderLeft: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-v2-mono)',
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(50,50,52,0.6)',
                  marginBottom: 20,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  // refero: public — Denton serif weight 300 for
                  // financial-journal stat presentation. Same family
                  // as the score numeral, smaller scale.
                  fontFamily: 'var(--font-v2-serif)',
                  fontWeight: 300,
                  fontSize: 'clamp(64px, 8vw, 116px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'rgb(50,50,52)',
                }}
              >
                {s.value}
                <span
                  style={{
                    fontSize: 'clamp(20px, 2.5vw, 32px)',
                    color: 'rgba(50,50,52,0.4)',
                    fontWeight: 400,
                  }}
                >
                  / {s.max}
                </span>
              </div>
              {/* Sketchy hand-drawn progress bar — Rough.js stroked
                  rectangle with hachure fill at percentage width */}
              <div style={{ marginTop: 16 }}>
                {/* Each sub-score's progress-bar hachure uses its own
                    meaning-colour (Structure orange, Insight Aether
                    Blue, Speed Fire Opal). Reads at a glance. */}
                <SketchyProgressBar
                  pct={(s.value / s.max) * 100}
                  height={24}
                  stroke="rgb(50,50,52)"
                  fillColor={s.fill}
                  roughness={1.5}
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-v2-mono)',
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(50,50,52,0.55)',
                  marginTop: 18,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(0,0,0,0.18)',
                }}
              >
                {s.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WALKTHROUGH — editorial paragraphs with Montserrat subheads */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 48,
          padding: '80px 36px 120px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <article>
          <p
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.6)',
              marginBottom: 24,
            }}
          >
            Ideal walkthrough · annotated
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-v2-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 5vw, 68px)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: 'rgb(50,50,52)',
              margin: 0,
              marginBottom: 32,
              maxWidth: '14ch',
            }}
          >
            What sharper looks like.
          </h2>
          {[
            {
              h: 'OPENING THE STRUCTURE',
              p: 'Strong move starting with revenue-vs-cost. The miss was assuming flat sales = flat revenue. In a real partner room you’d ask for revenue mix in the first 30 seconds — sales flat with mix shift is the most common profit leak in QSR.',
            },
            {
              h: 'THE COST-SIDE PIVOT',
              p: 'Once you confirmed cost-side, the order should have been variable cost first (raw inputs, labor) before fixed (rent, depreciation). Your branching went the other way for one turn — small but visible cost.',
            },
            {
              h: 'WHERE YOU EARNED THE SCORE',
              p: 'Turn 5: you took the partner’s pushback on the assumption and revised. <u class="v2-emph">That’s the move</u>. Most candidates double down. You didn’t — and the recovery is what moved you from 71 to 78.',
            },
            {
              h: 'TOMORROW',
              p: 'You’re ready for an M&A case next. The structure muscle is there; the next stretch is quant under synergy pressure.',
            },
          ].map((s) => (
            <div key={s.h} style={{ marginBottom: 40 }}>
              <h3
                style={{
                  fontFamily: 'var(--font-v2-mono)',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgb(50,50,52)',
                  margin: 0,
                  marginBottom: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(0,0,0,0.18)',
                }}
              >
                {s.h}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-v2-mono)',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'rgb(50,50,52)',
                  maxWidth: '60ch',
                  margin: 0,
                  letterSpacing: '0.005em',
                }}
                // refero: anthropic — `.v2-emph` lets us mark key
                // phrases inline with thick double-underline as
                // emphasis (replaces bold / color highlight). See
                // global style block at end of return.
                dangerouslySetInnerHTML={{ __html: s.p }}
              />
            </div>
          ))}
        </article>

        {/* TOMORROW'S CASE — sticky right card */}
        <aside
          style={{
            position: 'sticky',
            top: 36,
            alignSelf: 'flex-start',
            background: '#FFFFFF',
            padding: 24,
            height: 'fit-content',
            // refero: family — inset warm-stone border instead of
            // drop-shadow elevation. "Tomorrow's case" is a passive
            // next-up surface, not an active working pad. Paper-on-
            // paper definition without the elevation lie. /solve
            // right-rail keeps Cursor multi-layer because that one
            // IS the active working surface.
            boxShadow: 'inset 0 0 0 1px #e8e4dd',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.6)',
              paddingBottom: 8,
              borderBottom: '1px solid rgba(0,0,0,0.18)',
              marginBottom: 16,
            }}
          >
            Tomorrow · Case Nº0428
          </div>
          <h3
            style={{
              // refero: wise / mercury — serif italic for next-case
              // reveal headline. Editorial-newspaper feel rather than
              // sans caps shout.
              fontFamily: 'var(--font-v2-serif)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 32,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'rgb(50,50,52)',
              margin: 0,
              marginBottom: 14,
            }}
          >
            Pharma Synergy.
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'rgba(50,50,52,0.7)',
              marginBottom: 18,
            }}
          >
            Today you held structure under estimation. Tomorrow we add quant
            under M&A pressure.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.55)',
              marginBottom: 18,
            }}
          >
            <span>MCK</span>
            <span>·</span>
            <span>M&A</span>
            <span>·</span>
            <span>≈ 28 min</span>
          </div>
          <button
            type="button"
            style={{
              // refero: cursor — Onyx Outline #f54e00 primary CTA.
              // refero: ed hinrichsen — hard-offset stamped shadow.
              background: '#f54e00',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              boxShadow: 'rgba(50,50,52,0.45) 4px 4px 0px 0px',
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Begin tomorrow →
          </button>
        </aside>
      </section>

      <Marquee text="REPS IN THE SILENCE PAY OFF IN THE ROOM" variant="dark" />

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
        ← Design Lab v2 · Debrief
      </a>

      {/* refero: anthropic — `.v2-emph` thick double-underline for
          key phrase emphasis inside reflection paragraphs. Two stacked
          1.5px lines via text-decoration; reads as academic-journal
          emphasis without color or bold. */}
      <style>{`
        .v2-emph {
          text-decoration: underline double rgb(50,50,52);
          text-decoration-thickness: 1.5px;
          text-underline-offset: 4px;
          text-decoration-skip-ink: none;
        }
      `}</style>
    </main>
  );
}
