// Cinematic Shell — Phase 0 Preview
//
// "Bet 4" direction proof. The whole app sits inside a persistent 3D
// environment instead of flat HTML. This route shows ONE stage at full
// fidelity so Ash can feel the visual language before we commit to
// converting the production routes.
//
// Composition:
//   - <CinematicStage /> — full-bleed Three.js scene (asterisk + frame
//     + particles + lighting + camera parallax)
//   - HTML overlay above it: glassmorphism panel with "Today's case"
//     content and a coral CTA. Sits at z-index above the canvas with
//     backdrop-filter blur so the WebGL bleeds through.
//   - Type stack: Space Grotesk (display) + JetBrains Mono (technical).
//     No serif — cinematic-tech doesn't want editorial type.
//
// Phase 1 (deferred): multi-stage flythrough on route nav, asterisk
// traverses between stages, camera animates between stage positions.
// Phase 2 (deferred): all 5 production surfaces converted, mobile
// fallback (2D rendering for low-end / reduced-motion), perf tuning.

import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';
import { CinematicStage } from './_components/stage';

const display = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cn-display',
  weight: ['400', '500', '600', '700'],
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cn-mono',
  weight: ['400', '500'],
});

export const metadata = {
  title: 'Design Lab — Cinematic Shell (Bet 4)',
  robots: { index: false },
};

export default async function CinematicShellPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`cinematic-scope ${display.variable} ${mono.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#020308',
        color: '#FAFAFA',
        fontFamily: 'var(--font-cn-display)',
        overflow: 'hidden',
      }}
    >
      {/* WebGL stage — full-bleed. Sits at z-index 0. Camera parallaxes
          on mouse move; asterisk slowly rotates + breathes. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <CinematicStage />
      </div>

      {/* Top utility bar — back link + label. zIndex above the canvas. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
          pointerEvents: 'none',
        }}
      >
        <a
          href="/design-lab"
          style={{
            fontFamily: 'var(--font-cn-mono)',
            fontSize: 11,
            color: 'rgba(250,250,250,0.55)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            textDecoration: 'none',
            pointerEvents: 'auto',
          }}
        >
          ← Design Lab
        </a>
        <span
          style={{
            fontFamily: 'var(--font-cn-mono)',
            fontSize: 11,
            color: 'rgba(34,211,238,0.85)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
          }}
        >
          BET 4 · Cinematic Shell · Phase 0
        </span>
      </div>

      {/* Editorial line — top-left quadrant, subtle */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '6%',
          zIndex: 10,
          maxWidth: '380px',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-cn-mono)',
            fontSize: 10,
            color: 'rgba(34,211,238,0.85)',
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            marginBottom: 10,
          }}
        >
          Today · Day 12 · 12-day streak
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-cn-display)',
            fontSize: 'clamp(36px, 4.5vw, 60px)',
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            color: '#FAFAFA',
          }}
        >
          The room before the room.
        </h1>
      </div>

      {/* Glassmorphism case-card panel — bottom-right quadrant */}
      <div
        style={{
          position: 'absolute',
          right: '6%',
          bottom: '8%',
          zIndex: 10,
          width: 'min(420px, 90vw)',
          padding: 28,
          background: 'rgba(15, 23, 41, 0.55)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(34,211,238,0.25)',
          borderRadius: 14,
          boxShadow:
            '0 24px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-cn-mono)',
            fontSize: 10,
            color: 'rgba(34,211,238,0.85)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginBottom: 12,
          }}
        >
          Today’s Case
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-cn-display)',
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: '#FAFAFA',
            marginBottom: 12,
          }}
        >
          Coffee chain profitability under franchise pricing pressure
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-cn-display)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'rgba(250,250,250,0.7)',
            marginBottom: 22,
          }}
        >
          Today tests whether your structure holds when revenue is
          fragmenting and costs are sticky.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-cn-mono)',
              fontSize: 10,
              color: 'rgba(250,250,250,0.7)',
              padding: '6px 12px',
              border: '1px solid rgba(250,250,250,0.18)',
              borderRadius: 999,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            ≈ 22 min
          </span>
          <span
            style={{
              fontFamily: 'var(--font-cn-mono)',
              fontSize: 10,
              color: 'rgba(250,250,250,0.7)',
              padding: '6px 12px',
              border: '1px solid rgba(250,250,250,0.18)',
              borderRadius: 999,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            Profitability
          </span>
          <button
            type="button"
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-cn-display)',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 10,
              border: 'none',
              background:
                'linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%)',
              color: '#020308',
              cursor: 'pointer',
              boxShadow:
                '0 8px 24px -6px rgba(34,211,238,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            Begin →
          </button>
        </div>
      </div>

      {/* Bottom-left : palette + type identifier strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 32,
          zIndex: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {['#22D3EE', '#0EA5E9', '#0F1729', '#FAFAFA'].map((c) => (
          <span
            key={c}
            title={c}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: c,
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          />
        ))}
        <span
          style={{
            fontFamily: 'var(--font-cn-mono)',
            fontSize: 10,
            color: 'rgba(250,250,250,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginLeft: 8,
          }}
        >
          Space Grotesk · JetBrains Mono · cyan accent
        </span>
      </div>
    </main>
  );
}
