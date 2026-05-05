// Option C — Friendly Practice preview
//
// White canvas, vibrant purple primary, multi-color semantic system, rounded
// sans throughout. The "Brilliant + Headspace + Duolingo" direction. Plus
// Jakarta Sans for UI/body, Lexend for display headlines, JetBrains Mono kept
// for technical labels (numbers / streak / tags).
//
// Renders the same three preview blocks as Option B for apples-to-apples
// comparison:
//   1. Sign-in hero (public surface)
//   2. Dashboard "today's case" hero card
//   3. /solve first-turn chat moment
//
// Tokens scoped to `.option-c-scope` className — they don't leak into the
// rest of the app. Fonts come from next/font/google declared per-route.

import { Plus_Jakarta_Sans, Lexend, JetBrains_Mono } from 'next/font/google';

const friendlyBody = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-c-body',
  weight: ['400', '500', '600', '700'],
});
const friendlyDisplay = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-c-display',
  weight: ['500', '600', '700'],
});
const friendlyMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-c-mono',
  weight: ['400', '500'],
});

export const metadata = { title: 'Design Lab — Option C (Friendly)', robots: { index: false } };

export default function OptionCPage() {
  return (
    <main
      className={`option-c-scope min-h-screen ${friendlyBody.variable} ${friendlyDisplay.variable} ${friendlyMono.variable}`}
      style={{
        ['--oc-canvas' as any]: '#FFFFFF',
        ['--oc-elevated' as any]: '#FBFAFE',
        ['--oc-sunken' as any]: '#F4F1FB',
        ['--oc-text' as any]: '#1E1B2E',
        ['--oc-text-2' as any]: '#5B5773',
        ['--oc-text-3' as any]: '#9892B0',
        ['--oc-purple' as any]: '#7C3AED',
        ['--oc-purple-deep' as any]: '#6925D9',
        ['--oc-teal' as any]: '#06B6D4',
        ['--oc-emerald' as any]: '#10B981',
        ['--oc-amber' as any]: '#F59E0B',
        ['--oc-rose' as any]: '#F43F5E',
        ['--oc-border' as any]: '#E8E4F4',
        background: 'var(--oc-canvas)',
        color: 'var(--oc-text)',
        fontFamily: 'var(--font-c-body)',
      }}
    >
      <BackBar />

      {/* SIGN-IN HERO PREVIEW */}
      <Section label="01 / SIGN-IN HERO">
        <SigninPreview />
      </Section>

      {/* DASHBOARD HERO CARD */}
      <Section label="02 / DASHBOARD — TODAY'S CASE">
        <DashboardHeroPreview />
      </Section>

      {/* SOLVE FIRST-TURN CHAT */}
      <Section label="03 / SOLVE — FIRST-TURN CHAT">
        <SolveFirstTurnPreview />
      </Section>

      {/* PALETTE + TYPE */}
      <Section label="04 / TOKENS">
        <TokenStrip />
      </Section>

      <footer
        className="px-8 sm:px-16 py-12"
        style={{ borderTop: '1px solid var(--oc-border)' }}
      >
        <p
          className="text-sm"
          style={{
            color: 'var(--oc-text-3)',
            fontFamily: 'var(--font-c-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
          }}
        >
          Design Lab · Option C · Friendly Practice · 2026—05—06
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
      style={{ borderBottom: '1px solid var(--oc-border)' }}
    >
      <a
        href="/design-lab"
        className="text-xs"
        style={{
          fontFamily: 'var(--font-c-body)',
          color: 'var(--oc-text-3)',
          fontWeight: 500,
        }}
      >
        ← Design Lab
      </a>
      <span
        className="text-xs px-3 py-1 rounded-full"
        style={{
          fontFamily: 'var(--font-c-body)',
          color: 'var(--oc-purple)',
          background: 'var(--oc-sunken)',
          fontWeight: 600,
        }}
      >
        Option C · Friendly Practice
      </span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      className="px-8 sm:px-16 py-16 sm:py-20"
      style={{ borderBottom: '1px solid var(--oc-border)' }}
    >
      <div
        className="text-xs mb-10 inline-block px-3 py-1 rounded-full"
        style={{
          fontFamily: 'var(--font-c-mono)',
          color: 'var(--oc-purple)',
          background: 'var(--oc-sunken)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </section>
  );
}

// Friendly mascot — placeholder rounded asterisk in purple. Sized via prop
// so we can drop a 96px hero version next to text and a 28px inline version
// in chat. Stops short of full rive/lottie animation in a static preview.
function FriendlyMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="fmgrad" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#A872F5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>
      {[0, 45, 90, 135].map((deg) => (
        <rect
          key={deg}
          x={48 - 7}
          y={10}
          width={14}
          height={76}
          rx={7}
          fill="url(#fmgrad)"
          transform={`rotate(${deg} 48 48)`}
        />
      ))}
      <circle cx={48} cy={48} r={9} fill="#FFFFFF" />
    </svg>
  );
}

// ---------- Preview blocks --------------------------------------------

function SigninPreview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
      <div className="md:col-span-7 flex flex-col gap-6">
        <FriendlyMark size={72} />
        <h1
          className="leading-[1.05] tracking-tight"
          style={{
            fontFamily: 'var(--font-c-display)',
            fontSize: 'clamp(40px, 5.4vw, 72px)',
            fontWeight: 700,
            color: 'var(--oc-text)',
          }}
        >
          Show up. <span style={{ color: 'var(--oc-purple)' }}>Solve a case.</span> Build the muscle.
        </h1>
        <p
          className="text-lg leading-relaxed max-w-[52ch]"
          style={{ color: 'var(--oc-text-2)', fontFamily: 'var(--font-c-body)' }}
        >
          1,165 real cases. A daily drill in 4 minutes. A streak that tracks
          your consistency. Built for the cohort that wants to show up before
          the recruiter does.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: 'var(--oc-sunken)',
              color: 'var(--oc-purple-deep)',
              fontWeight: 600,
              fontFamily: 'var(--font-c-body)',
            }}
          >
            🔥 12-day streak
          </span>
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: '#ECFDF5',
              color: 'var(--oc-emerald)',
              fontWeight: 600,
              fontFamily: 'var(--font-c-body)',
            }}
          >
            ✓ 47 cases done
          </span>
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: '#FEF3C7',
              color: '#B45309',
              fontWeight: 600,
              fontFamily: 'var(--font-c-body)',
            }}
          >
            ⚡ 1,240 XP
          </span>
        </div>
      </div>
      <div className="md:col-span-5">
        <div
          className="p-8 rounded-2xl"
          style={{ background: 'var(--oc-elevated)', border: '1px solid var(--oc-border)', boxShadow: '0 12px 40px -12px rgba(124,58,237,0.18)' }}
        >
          <p
            className="text-sm mb-5"
            style={{ color: 'var(--oc-text-2)', fontFamily: 'var(--font-c-body)', fontWeight: 600 }}
          >
            Welcome back 👋
          </p>
          <input
            type="email"
            placeholder="you@school.edu"
            className="w-full px-4 py-3 mb-4 rounded-xl"
            style={{
              background: 'var(--oc-canvas)',
              border: '1.5px solid var(--oc-border)',
              fontFamily: 'var(--font-c-body)',
              color: 'var(--oc-text)',
              outline: 'none',
            }}
          />
          <button
            className="w-full py-3 rounded-xl font-semibold transition-transform"
            style={{
              background: 'var(--oc-purple)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-c-body)',
              boxShadow: '0 6px 16px -4px rgba(124,58,237,0.4)',
            }}
          >
            Let&apos;s go →
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardHeroPreview() {
  return (
    <div
      className="p-10 sm:p-16 rounded-3xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--oc-canvas) 0%, var(--oc-sunken) 100%)',
        border: '1px solid var(--oc-border)',
      }}
    >
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: 'var(--oc-purple)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-c-body)',
            fontWeight: 600,
          }}
        >
          Today’s Case
        </div>
        <div
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: '#FEF3C7',
            color: '#B45309',
            fontFamily: 'var(--font-c-body)',
            fontWeight: 600,
          }}
        >
          🔥 12-day streak
        </div>
        <div
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: '#ECFDF5',
            color: 'var(--oc-emerald)',
            fontFamily: 'var(--font-c-body)',
            fontWeight: 600,
          }}
        >
          ⚡ 1,240 XP
        </div>
      </div>
      <h2
        className="leading-[1.0] tracking-tight mb-6 max-w-[18ch]"
        style={{
          fontFamily: 'var(--font-c-display)',
          fontSize: 'clamp(38px, 5vw, 68px)',
          fontWeight: 700,
          color: 'var(--oc-text)',
        }}
      >
        Coffee chain profitability under{' '}
        <span style={{ color: 'var(--oc-purple)' }}>franchise pressure</span>
      </h2>
      <p
        className="text-lg leading-snug mb-10 max-w-[44ch]"
        style={{ color: 'var(--oc-text-2)', fontFamily: 'var(--font-c-body)', fontWeight: 500 }}
      >
        4-minute drill — no full session. Just structure → math → synthesis.
        Show up daily, the muscle builds itself.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{
            background: 'var(--oc-elevated)',
            border: '1px solid var(--oc-border)',
            color: 'var(--oc-text-2)',
            fontFamily: 'var(--font-c-body)',
          }}
        >
          ≈ 4 min
        </span>
        <span
          className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{
            background: 'var(--oc-elevated)',
            border: '1px solid var(--oc-border)',
            color: 'var(--oc-text-2)',
            fontFamily: 'var(--font-c-body)',
          }}
        >
          Estimation · easy
        </span>
        <button
          className="ml-auto px-8 py-4 rounded-2xl text-base font-bold transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--oc-purple)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-c-body)',
            boxShadow: '0 10px 24px -6px rgba(124,58,237,0.45)',
          }}
        >
          Start drill →
        </button>
      </div>
    </div>
  );
}

function SolveFirstTurnPreview() {
  return (
    <div className="max-w-[60ch] flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <FriendlyMark size={56} />
        <div>
          <p
            className="text-sm"
            style={{
              fontFamily: 'var(--font-c-body)',
              fontWeight: 700,
              color: 'var(--oc-text)',
            }}
          >
            Ash · EM at Bain
          </p>
          <p
            className="text-xs"
            style={{
              fontFamily: 'var(--font-c-body)',
              color: 'var(--oc-text-3)',
              fontWeight: 500,
            }}
          >
            Turn 1 of 3 — Structure
          </p>
        </div>
      </div>
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'var(--oc-sunken)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <p
          className="leading-[1.45]"
          style={{
            fontFamily: 'var(--font-c-display)',
            fontSize: 'clamp(20px, 2vw, 26px)',
            fontWeight: 500,
            color: 'var(--oc-text)',
          }}
        >
          A coffee chain’s profitability dropped 18% last quarter — but
          same-store sales are flat. Where would you start?
        </p>
      </div>
      <input
        type="text"
        placeholder="Type your move…"
        className="w-full px-5 py-4 rounded-2xl"
        style={{
          background: 'var(--oc-elevated)',
          border: '1.5px solid var(--oc-border)',
          fontFamily: 'var(--font-c-body)',
          color: 'var(--oc-text)',
          fontSize: '15px',
          outline: 'none',
        }}
      />
    </div>
  );
}

function TokenStrip() {
  const colors = [
    { name: 'Canvas', hex: '#FFFFFF' },
    { name: 'Elevated', hex: '#FBFAFE' },
    { name: 'Sunken', hex: '#F4F1FB' },
    { name: 'Text', hex: '#1E1B2E' },
    { name: 'Purple (primary)', hex: '#7C3AED' },
    { name: 'Purple deep', hex: '#6925D9' },
    { name: 'Teal', hex: '#06B6D4' },
    { name: 'Emerald (success)', hex: '#10B981' },
    { name: 'Amber (streak)', hex: '#F59E0B' },
    { name: 'Rose (wrong)', hex: '#F43F5E' },
    { name: 'Border', hex: '#E8E4F4' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {colors.map((c) => (
        <div key={c.name} className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl"
            style={{ background: c.hex, border: '1px solid var(--oc-border)' }}
          />
          <div>
            <div
              className="text-sm"
              style={{ fontFamily: 'var(--font-c-body)', color: 'var(--oc-text)', fontWeight: 600 }}
            >
              {c.name}
            </div>
            <div
              className="text-xs"
              style={{
                fontFamily: 'var(--font-c-mono)',
                color: 'var(--oc-text-3)',
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
            fontFamily: 'var(--font-c-display)',
            fontSize: '28px',
            color: 'var(--oc-text)',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Lexend · rounded display
        </p>
        <p
          style={{
            fontFamily: 'var(--font-c-body)',
            fontSize: '15px',
            color: 'var(--oc-text-2)',
          }}
        >
          Plus Jakarta Sans · 15px body. The quick brown fox jumps over the lazy dog.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-c-mono)',
            fontSize: '12px',
            color: 'var(--oc-text-3)',
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
