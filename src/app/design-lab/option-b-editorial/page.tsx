// Option B — Editorial Brutalism preview
//
// Bone-white paper canvas, deep ink black text, single oxblood accent. The
// "HBR meets Linear" direction. Newsreader serif for headlines, Inter Tight
// for body, JetBrains Mono for technical labels. Hairline borders, generous
// whitespace, no decorative color, no character mascot — just typography
// doing all the heavy lifting.
//
// Renders three preview blocks that match real CasePad surfaces so the
// comparison vs Option C is apples-to-apples:
//   1. Sign-in hero (public surface)
//   2. Dashboard "today's case" hero card
//   3. /solve first-turn chat moment
//
// Tokens are scoped to a wrapper className `.option-b-scope` — they don't
// leak into the rest of the app. Fonts come from next/font/google declared
// per-route (no global registration).

import { Newsreader, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

const editorialSerif = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-b-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});
const editorialBody = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-b-body',
  weight: ['400', '500', '600'],
});
const editorialMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-b-mono',
  weight: ['400', '500'],
});

export const metadata = { title: 'Design Lab — Option B (Editorial)', robots: { index: false } };

export default async function OptionBPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;
  return (
    <main
      className={`option-b-scope min-h-screen ${editorialSerif.variable} ${editorialBody.variable} ${editorialMono.variable}`}
      style={{
        // Scoped token overrides — only inside this main element.
        ['--ob-canvas' as any]: '#FAFAF7',
        ['--ob-elevated' as any]: '#FFFFFF',
        ['--ob-ink' as any]: '#0A0A0A',
        ['--ob-ink-2' as any]: '#3F3F3F',
        ['--ob-ink-3' as any]: '#7A7A7A',
        ['--ob-accent' as any]: '#8B1538',
        ['--ob-accent-fg' as any]: '#FFFFFF',
        ['--ob-rule' as any]: '#1A1A1A',
        ['--ob-hairline' as any]: '#D8D5CE',
        background: 'var(--ob-canvas)',
        color: 'var(--ob-ink)',
        fontFamily: 'var(--font-b-body)',
      }}
    >
      <BackBar />

      {/* SIGN-IN HERO PREVIEW */}
      <Section label="01 / SIGN-IN HERO">
        <SigninPreview />
      </Section>

      {/* DASHBOARD HERO CARD PREVIEW */}
      <Section label="02 / DASHBOARD — TODAY'S CASE">
        <DashboardHeroPreview />
      </Section>

      {/* SOLVE FIRST-TURN CHAT */}
      <Section label="03 / SOLVE — FIRST-TURN CHAT">
        <SolveFirstTurnPreview />
      </Section>

      {/* PALETTE + TYPE SAMPLES */}
      <Section label="04 / TOKENS">
        <TokenStrip />
      </Section>

      <footer className="px-8 sm:px-16 py-12" style={{ borderTop: '1px solid var(--ob-hairline)' }}>
        <p
          className="text-sm"
          style={{ color: 'var(--ob-ink-3)', fontFamily: 'var(--font-b-mono)' }}
        >
          DESIGN LAB · OPTION B · EDITORIAL BRUTALISM · 2026—05—06
        </p>
      </footer>
    </main>
  );
}

// ---------- Layout primitives -----------------------------------------

function BackBar() {
  return (
    <div
      className="px-8 sm:px-16 py-4 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--ob-hairline)' }}
    >
      <a
        href="/design-lab"
        className="text-xs"
        style={{
          fontFamily: 'var(--font-b-mono)',
          color: 'var(--ob-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        ← Design Lab
      </a>
      <span
        className="text-xs"
        style={{
          fontFamily: 'var(--font-b-mono)',
          color: 'var(--ob-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        Option B · Editorial Brutalism
      </span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="px-8 sm:px-16 py-16 sm:py-20" style={{ borderBottom: '1px solid var(--ob-hairline)' }}>
      <div
        className="text-xs mb-10"
        style={{
          fontFamily: 'var(--font-b-mono)',
          color: 'var(--ob-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        {label}
      </div>
      {children}
    </section>
  );
}

// ---------- Preview blocks --------------------------------------------

function SigninPreview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
      <div className="md:col-span-7">
        <p
          className="text-xs mb-6"
          style={{
            fontFamily: 'var(--font-b-mono)',
            color: 'var(--ob-ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
          }}
        >
          The room before the room
        </p>
        <h1
          className="leading-[0.95] tracking-tight mb-8"
          style={{
            fontFamily: 'var(--font-b-display)',
            fontSize: 'clamp(48px, 6vw, 84px)',
            fontWeight: 500,
            color: 'var(--ob-ink)',
          }}
        >
          Practice the case <em style={{ fontStyle: 'italic' }}>before</em> the partner asks the question.
        </h1>
        <p
          className="text-lg leading-relaxed max-w-[52ch]"
          style={{ color: 'var(--ob-ink-2)', fontFamily: 'var(--font-b-body)' }}
        >
          1,165 real consulting cases. An interviewer who pushes back. A debrief
          that tells you what you missed and why.
        </p>
      </div>
      <div className="md:col-span-5">
        <div
          className="p-8"
          style={{ background: 'var(--ob-elevated)', border: '1px solid var(--ob-rule)' }}
        >
          <p
            className="text-xs mb-4"
            style={{
              fontFamily: 'var(--font-b-mono)',
              color: 'var(--ob-ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
            }}
          >
            Cohort sign-in
          </p>
          <input
            type="email"
            placeholder="you@school.edu"
            className="w-full px-4 py-3 mb-4"
            style={{
              background: 'transparent',
              border: '1px solid var(--ob-rule)',
              fontFamily: 'var(--font-b-body)',
              color: 'var(--ob-ink)',
            }}
          />
          <button
            className="w-full py-3 font-medium"
            style={{
              background: 'var(--ob-accent)',
              color: 'var(--ob-accent-fg)',
              fontFamily: 'var(--font-b-body)',
            }}
          >
            Enter →
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardHeroPreview() {
  return (
    <div
      className="p-10 sm:p-16"
      style={{ background: 'var(--ob-elevated)', border: '1px solid var(--ob-rule)' }}
    >
      <p
        className="text-xs mb-8"
        style={{
          fontFamily: 'var(--font-b-mono)',
          color: 'var(--ob-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        Today’s Case · Day 12
      </p>
      <h2
        className="leading-[0.95] tracking-tight mb-8 max-w-[18ch]"
        style={{
          fontFamily: 'var(--font-b-display)',
          fontSize: 'clamp(40px, 5vw, 72px)',
          fontWeight: 500,
          color: 'var(--ob-ink)',
        }}
      >
        Coffee chain profitability under <em style={{ fontStyle: 'italic' }}>franchise pricing pressure</em>
      </h2>
      <p
        className="text-xl leading-snug mb-12 max-w-[44ch]"
        style={{
          fontFamily: 'var(--font-b-display)',
          fontStyle: 'italic',
          color: 'var(--ob-ink-2)',
          fontWeight: 400,
        }}
      >
        Today tests whether your structure holds when revenue is fragmenting and costs are sticky.
      </p>
      <div className="flex items-center gap-6 flex-wrap">
        <span
          className="text-xs px-3 py-1.5"
          style={{
            border: '1px solid var(--ob-rule)',
            fontFamily: 'var(--font-b-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--ob-ink)',
          }}
        >
          ≈ 22 min
        </span>
        <span
          className="text-xs px-3 py-1.5"
          style={{
            border: '1px solid var(--ob-rule)',
            fontFamily: 'var(--font-b-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--ob-ink)',
          }}
        >
          Medium
        </span>
        <button
          className="ml-auto px-8 py-4 text-base font-medium"
          style={{
            background: 'var(--ob-accent)',
            color: 'var(--ob-accent-fg)',
            fontFamily: 'var(--font-b-body)',
          }}
        >
          Begin →
        </button>
      </div>
    </div>
  );
}

function SolveFirstTurnPreview() {
  return (
    <div className="max-w-[60ch]">
      <p
        className="text-xs mb-6"
        style={{
          fontFamily: 'var(--font-b-mono)',
          color: 'var(--ob-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        Ash · EM at Bain
      </p>
      <p
        className="leading-[1.3] mb-12"
        style={{
          fontFamily: 'var(--font-b-display)',
          fontSize: 'clamp(22px, 2.4vw, 32px)',
          fontWeight: 400,
          color: 'var(--ob-ink)',
        }}
      >
        Today we’re looking at why a coffee chain’s profitability dropped 18%
        last quarter despite same-store sales holding steady. Where would you
        start?
      </p>
      <input
        type="text"
        placeholder="Type your move…"
        className="w-full px-4 py-3"
        style={{
          background: 'var(--ob-elevated)',
          border: '1px solid var(--ob-rule)',
          fontFamily: 'var(--font-b-body)',
          color: 'var(--ob-ink)',
          fontSize: '15px',
        }}
      />
    </div>
  );
}

function TokenStrip() {
  const colors = [
    { name: 'Canvas', hex: '#FAFAF7' },
    { name: 'Elevated', hex: '#FFFFFF' },
    { name: 'Ink', hex: '#0A0A0A' },
    { name: 'Ink·2', hex: '#3F3F3F' },
    { name: 'Accent (oxblood)', hex: '#8B1538' },
    { name: 'Hairline', hex: '#D8D5CE' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {colors.map((c) => (
        <div key={c.name} className="flex items-center gap-4">
          <div
            className="w-14 h-14"
            style={{ background: c.hex, border: '1px solid var(--ob-hairline)' }}
          />
          <div>
            <div
              className="text-sm font-medium"
              style={{ fontFamily: 'var(--font-b-body)', color: 'var(--ob-ink)' }}
            >
              {c.name}
            </div>
            <div
              className="text-xs"
              style={{
                fontFamily: 'var(--font-b-mono)',
                color: 'var(--ob-ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
              }}
            >
              {c.hex}
            </div>
          </div>
        </div>
      ))}
      <div className="col-span-2 md:col-span-3 mt-6">
        <p
          style={{
            fontFamily: 'var(--font-b-display)',
            fontSize: '28px',
            color: 'var(--ob-ink)',
            marginBottom: 4,
          }}
        >
          Newsreader · serif display
        </p>
        <p style={{ fontFamily: 'var(--font-b-body)', fontSize: '15px', color: 'var(--ob-ink-2)' }}>
          Inter Tight · 15px body. The quick brown fox jumps over the lazy dog.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-b-mono)',
            fontSize: '12px',
            color: 'var(--ob-ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            marginTop: 4,
          }}
        >
          JetBrains Mono · 12px · technical labels
        </p>
      </div>
    </div>
  );
}
