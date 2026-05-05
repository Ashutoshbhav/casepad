// Halo — OroSwap-flavor sample, post-deep-research-via-Playwright.
//
// REAL DNA extracted from oroswap.org via computed-style inspection:
//   - canvas:  rgb(11,11,11)              near-black, NOT navy
//   - text:    rgba(250,250,250,0.98)     off-white at 98% alpha
//   - font:    Inter ONLY, weights 300/400/500
//   - hero h1: Inter 500 / 37px / line-height 46px (modest, not gigantic)
//   - body:    Inter 400 / 12-14px / tight line-heights
//   - accent:  rgb(201,177,132) gold at 4-8% alpha (atmospheric, never solid)
//             rgb(255,211,132) brighter gold at 30% for highlights
//   - buttons: heavy pill (32-40px radius), sub-pixel borders (0.67px)
//   - signature: phone mockup centered inside a glowing golden halo +
//     two floating chat bubbles showing "Hey, swap..." / "On it!..."
//
// The halo is the hero. No need for a real 3D phone — CSS radial
// gradients can manufacture the "object glowing in space" feel that
// OroSwap has, then we put a rounded dark "case card mockup" inside it
// showing CasePad's actual interview chat.

import { Inter } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-h-body',
  weight: ['300', '400', '500'],
});

export const metadata = {
  title: 'Design Lab — Halo (OroSwap-flavor)',
  robots: { index: false },
};

export default async function HaloPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`halo-scope ${inter.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(11,11,11)',
        color: 'rgba(250,250,250,0.98)',
        fontFamily: 'var(--font-h-body)',
        fontSize: 14,
        overflow: 'hidden',
      }}
    >
      {/* TOP NAV — minimal nav links centered, ghost CTA right */}
      <header
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
        }}
      >
        {/* Wordmark left — gold orb + CASEPAD caps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: 'radial-gradient(circle at 35% 30%, #F0D9A6 0%, #C9B184 55%, #6E5A36 100%)',
              boxShadow: '0 0 16px rgba(201,177,132,0.45)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-h-body)',
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: '0.06em',
              color: '#FAFAFA',
            }}
          >
            CASEPAD
          </span>
        </div>
        {/* Nav links center */}
        <nav style={{ display: 'flex', gap: 32 }}>
          {['About', 'Today', 'Library', 'Cohort', 'Manifesto'].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontFamily: 'var(--font-h-body)',
                fontSize: 13,
                fontWeight: 400,
                color: 'rgba(250,250,250,0.85)',
                textDecoration: 'none',
              }}
            >
              {l}
            </a>
          ))}
        </nav>
        {/* Ghost pill CTA right — exact OroSwap "Launch App" specs */}
        <button
          type="button"
          style={{
            background: 'rgba(201,177,132,0.08)',
            color: 'rgb(253,254,214)',
            border: '0.67px solid rgba(248,248,248,0.2)',
            borderRadius: 32,
            padding: '12px 20px',
            fontFamily: 'var(--font-h-body)',
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
          }}
        >
          Open Cohort
        </button>
      </header>

      {/* THE HALO — pure CSS radial gradient stack to manufacture the
          "object glowing in space" effect. Multiple concentric rings of
          gold at decreasing alpha give the god-rays / aura. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: 'min(820px, 78vw)',
          height: 'min(820px, 78vw)',
          background: `
            radial-gradient(circle at 50% 50%,
              rgba(255,211,132,0.42) 0%,
              rgba(255,211,132,0.18) 18%,
              rgba(201,177,132,0.10) 35%,
              rgba(201,177,132,0.04) 55%,
              rgba(11,11,11,0)         72%
            )
          `,
          filter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />
      {/* Sharper inner ring (the bright halo edge) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, 42vw)',
          height: 'min(440px, 42vw)',
          borderRadius: 999,
          border: '1px solid rgba(255,211,132,0.25)',
          boxShadow:
            '0 0 80px 8px rgba(255,211,132,0.18), 0 0 200px 30px rgba(201,177,132,0.10)',
          pointerEvents: 'none',
        }}
      />

      {/* MOCKUP — rounded dark card centered in the halo, mimics the
          OroSwap iPhone showing the swap UI. Ours shows the CasePad
          chat-arena UI in miniature — the AI interviewer asking the
          first turn, with the case header above. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: 'min(280px, 28vw)',
          height: 'min(560px, 56vw)',
          background: 'rgb(14,14,11)',
          borderRadius: 36,
          border: '1px solid rgba(248,248,248,0.06)',
          boxShadow:
            '0 30px 80px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
          padding: '22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-h-body)', fontSize: 11, color: 'rgba(250,250,250,0.45)' }}>
            Case · Day 12
          </span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#C9B184', display: 'inline-block' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-h-body)', fontSize: 18, fontWeight: 500, lineHeight: 1.2, marginBottom: 14 }}>
          Coffee chain<br />profitability.
        </div>
        <div style={{ fontFamily: 'var(--font-h-body)', fontSize: 10, color: 'rgba(250,250,250,0.4)', marginBottom: 6 }}>
          BCG · Profitability · 22 min
        </div>
        <div style={{ height: 1, background: 'rgba(248,248,248,0.08)', margin: '4px 0 12px' }} />
        {/* Mini chat — Ash's first turn */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            padding: '10px 12px',
            fontFamily: 'var(--font-h-body)',
            fontSize: 11,
            color: 'rgba(250,250,250,0.82)',
            lineHeight: 1.45,
            alignSelf: 'flex-start',
            maxWidth: '90%',
          }}
        >
          Profits down 18%, sales flat. Where do you start?
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          style={{
            background: 'rgba(255,211,132,0.18)',
            color: 'rgb(255,239,206)',
            border: '0.67px solid rgba(255,211,132,0.4)',
            borderRadius: 28,
            padding: '12px 0',
            fontFamily: 'var(--font-h-body)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            width: '100%',
            cursor: 'pointer',
          }}
        >
          Begin →
        </button>
      </div>

      {/* FLOATING CHAT BUBBLE LEFT — like OroSwap's "On it! Swapping..." */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - min(380px, 38vw))',
          top: '64%',
          zIndex: 6,
          background: 'rgba(255,255,255,0.92)',
          color: 'rgb(14,14,11)',
          borderRadius: 28,
          padding: '12px 20px',
          fontFamily: 'var(--font-h-body)',
          fontSize: 12,
          fontWeight: 500,
          backdropFilter: 'blur(4px)',
          maxWidth: 280,
        }}
      >
        I&apos;d split it: revenue side vs cost side first.
      </div>

      {/* FLOATING CHAT BUBBLE RIGHT — Ash's reply */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% + min(80px, 8vw))',
          top: '50%',
          zIndex: 6,
          background: 'rgba(255,255,255,0.92)',
          color: 'rgb(14,14,11)',
          borderRadius: 28,
          padding: '12px 20px',
          fontFamily: 'var(--font-h-body)',
          fontSize: 12,
          fontWeight: 500,
          backdropFilter: 'blur(4px)',
          maxWidth: 260,
        }}
      >
        Good. Defend that order — why revenue first?
      </div>

      {/* HEADLINE — sits at the very top of the halo, modest size matching
          OroSwap's actual H1 (37px Inter 500), not the gigantic 100px
          tells of amateur clones. The halo carries the visual weight,
          not the type. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 110,
          textAlign: 'center',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-h-body)',
            fontSize: 11,
            fontWeight: 400,
            color: 'rgba(255,211,132,0.85)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          AI Case Interviewer · for B-school recruitment
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-h-body)',
            fontSize: 'clamp(28px, 3vw, 42px)',
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: '-0.01em',
            color: 'rgba(250,250,250,0.98)',
            margin: 0,
            maxWidth: 720,
            marginInline: 'auto',
          }}
        >
          Practice the case before the partner asks.
        </h1>
      </div>

      {/* BOTTOM STRIP — three editorial figures (mirrors OroSwap's
          "413M / 31M / 80K" stat row). Set in mono digits, modest size. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          zIndex: 8,
          display: 'flex',
          justifyContent: 'center',
          gap: 80,
          pointerEvents: 'none',
        }}
      >
        {[
          ['1,165', 'real cases'],
          ['6 wks', 'to interview'],
          ['04 min', 'daily drill'],
        ].map(([n, c]) => (
          <div key={c} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-h-body)',
                fontSize: 28,
                fontWeight: 500,
                color: 'rgba(250,250,250,0.92)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {n}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-h-body)',
                fontSize: 11,
                color: 'rgba(250,250,250,0.45)',
                letterSpacing: '0.04em',
              }}
            >
              {c}
            </div>
          </div>
        ))}
      </div>

      {/* BACK BAR */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 32,
          zIndex: 12,
        }}
      >
        <a
          href="/design-lab"
          style={{
            fontFamily: 'var(--font-h-body)',
            fontSize: 10,
            color: 'rgba(250,250,250,0.4)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Design Lab · Halo
        </a>
      </div>
    </main>
  );
}
