'use client';

// SigninCarouselClient — full interactive signin layout.
//
// Owns:
//   - photo carousel state (active index, auto-cycle every ~7.5s,
//     cross-fade transitions, prefers-reduced-motion respected)
//   - decision-tree topology pick (random per visit)
//   - pagination indicator that syncs with the carousel state
//
// The page.tsx parent is a thin server wrapper that just registers
// fonts and admin-gates the route.

import { useState } from 'react';
import { PhotoCarousel, PHOTO_COUNT } from '../_components/photo-carousel';
import { DecisionTreeOverlay } from '../_components/decision-tree-overlay';

export function SigninCarouselClient() {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <>
      {/* LAYER 1 — photo carousel (auto-rotates) */}
      <PhotoCarousel onIndexChange={setActivePhoto} />

      {/* Subtle gradient — top + bottom darken so floating UI is legible */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 25%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER 2 — Rough.js decision-tree, random framework per visit */}
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

      {/* LAYER 3a — wordmark masthead top-left */}
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

      {/* LAYER 3b — MENU pill top-right.
          refero: anthropic — asymmetric 0 0 8px 8px radius (flat top,
          rounded bottom). Library-card / index-tab shape. Reads as
          "this is a navigation index, not a primary action" — the
          real CTA is the orange Enter-the-room below. */}
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
          borderRadius: '0 0 8px 8px',
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
          style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}
        >
          <span style={{ display: 'block', width: 22, height: 1, background: 'rgb(50,50,52)' }} />
          <span style={{ display: 'block', width: 22, height: 1, background: 'rgb(50,50,52)' }} />
        </span>
      </button>

      {/* LAYER 3c — COHORT SIGN-IN service card */}
      <div
        style={{
          position: 'absolute',
          top: 116,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 28vw)',
          background: '#FFFFFF',
          padding: 24,
          // refero: notion — 5-stop diffused soft shadow stack.
          // Paper-on-photo elevation; cohort card now visibly lifts
          // off the boardroom photo without feeling like a modal.
          boxShadow:
            'rgba(0,0,0,0.01) 0 1px 3px 0px, ' +
            'rgba(0,0,0,0.02) 0 3px 7px 0px, ' +
            'rgba(0,0,0,0.02) 0 7px 15px 0px, ' +
            'rgba(0,0,0,0.04) 0 14px 28px 0px, ' +
            'rgba(0,0,0,0.05) 0 23px 52px 0px',
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
          className="v2-pill-input"
          style={{
            // refero: vanta — 999px fully-pill input with hairline
            // border. Distinct from production's bottom-line-only
            // input; signals "command, not form."
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid rgba(50,50,52,0.30)',
            borderRadius: 999,
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
            // refero: cursor — Onyx Outline #f54e00 primary CTA.
            // refero: ed hinrichsen — hard-offset stamped shadow
            // (no blur). Gives the orange button a tactile rubber-
            // stamp / typewriter-key feel that rhymes with v2's
            // Rough.js notebook DNA.
            background: '#f54e00',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '12px 22px',
            boxShadow: 'rgba(50,50,52,0.45) 4px 4px 0px 0px',
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

      {/* LAYER 3d — live carousel pagination, syncs with state */}
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
            fontVariantNumeric: 'tabular-nums',
            transition: 'opacity 300ms ease',
          }}
        >
          {String(activePhoto + 1).padStart(2, '0')} / {String(PHOTO_COUNT).padStart(2, '0')}
        </span>
        <span style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.4)' }} />
      </div>

      {/* LAYER 3e — bottom marquee */}
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

      {/* LAYER 3g — bottom-right LIVE pulse + lang */}
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
        /* refero: zed — inset bottom-line + halo on focused input.
           Mechanical-keyboard "key-pressed" focus state, sharper
           than ring-glow. Uses orange to tie to live-action color. */
        .v2-pill-input:focus {
          border-color: #f54e00;
          box-shadow:
            #f54e00 0 -2px 0 inset,
            rgba(245, 78, 0, 0.18) 0 1px 6px 0;
        }
      `}</style>
    </>
  );
}
