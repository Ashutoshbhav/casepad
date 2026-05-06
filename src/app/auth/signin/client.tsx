'use client';

// Production /auth/signin client island.
// Photo carousel + Rough.js decision-tree overlay (HUPR-flavor) +
// cohort sign-in card wired to the directSignIn server action.
// Hides the persistent 3D coral asterisk on this route only.

import { useState } from 'react';
import { PhotoCarousel, PHOTO_COUNT } from '../../design-lab/v2/_components/photo-carousel';
import { DecisionTreeOverlay } from '../../design-lab/v2/_components/decision-tree-overlay';
import { useAsteriskScene } from '@/hooks/use-asterisk-scene';

export function SigninClient({
  action,
  errMsg,
  returnTo,
  showSessionExpired,
}: {
  action: (formData: FormData) => Promise<void>;
  errMsg: string | null;
  returnTo?: string;
  showSessionExpired: boolean;
}) {
  // Hide the persistent 3D coral asterisk on signin — the photo +
  // decision tree is the visual centerpiece here.
  useAsteriskScene('hidden');

  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <>
      {/* LAYER 1 — full-bleed photo carousel */}
      <PhotoCarousel onIndexChange={setActivePhoto} />

      {/* Top + bottom darken gradient so floating UI is legible */}
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

      {/* LAYER 2 — Rough.js decision tree, random framework per visit */}
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

      {/* LAYER 3b — MENU pill top-right (Anthropic asymmetric tab radius) */}
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

      {/* LAYER 3c — Cohort sign-in card. Real form wired to directSignIn. */}
      <div
        style={{
          position: 'absolute',
          top: 116,
          right: 36,
          zIndex: 10,
          width: 'min(360px, 28vw)',
          background: '#FFFFFF',
          padding: 24,
          // refero: notion — 5-stop diffused soft shadow
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
          Cohort access. Enter the email on the allowlist, we&rsquo;ll sign you in immediately.
        </p>

        {showSessionExpired && (
          <div
            style={{
              border: '1px solid #f54e00',
              color: '#d04200',
              padding: '8px 10px',
              borderRadius: 6,
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 11,
              marginBottom: 14,
            }}
          >
            Your session expired. Sign in again to pick up where you left off.
          </div>
        )}

        <form action={action}>
          <input
            name="email"
            type="email"
            placeholder="you@school.edu"
            required
            autoFocus
            className="v2-pill-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid rgba(50,50,52,0.30)',
              borderRadius: 999,
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 14,
              color: 'rgb(50,50,52)',
              outline: 'none',
              marginBottom: 18,
            }}
          />
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
          <button
            type="submit"
            style={{
              // refero: cursor — Onyx Outline #f54e00 primary CTA.
              // refero: ed hinrichsen — hard-offset stamped shadow.
              background: '#f54e00',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontFamily: 'var(--font-v2-mono)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: 'rgba(50,50,52,0.45) 4px 4px 0px 0px',
            }}
          >
            Enter the room →
          </button>
          {errMsg && (
            <div
              style={{
                marginTop: 14,
                border: '1px solid #f54e00',
                color: '#d04200',
                padding: '8px 10px',
                borderRadius: 6,
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 11,
              }}
            >
              {errMsg}
            </div>
          )}
        </form>

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
        <div
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 10,
            color: 'rgb(120,118,118)',
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          By signing in, you agree to the{' '}
          <a
            href="/terms"
            style={{ color: 'rgb(50,50,52)', textDecoration: 'underline' }}
          >
            Terms of Use
          </a>
          .
        </div>
      </div>

      {/* LAYER 3d — carousel pagination */}
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
          }}
        >
          {String(activePhoto + 1).padStart(2, '0')} / {String(PHOTO_COUNT).padStart(2, '0')}
        </span>
        <span style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.4)' }} />
      </div>

      {/* LAYER 3e — bottom marquee, smaller + faster */}
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
            fontSize: 'clamp(48px, 6vw, 88px)',
            lineHeight: 0.9,
            color: '#FFFFFF',
            letterSpacing: '-0.012em',
            paddingBottom: 8,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} style={{ paddingRight: 80, flexShrink: 0 }}>
              PRACTICE THE ROOM&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Bottom-left + bottom-right colophon strips */}
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

      <style>{`
        @keyframes v2-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .v2-marquee {
          animation: v2-marquee 16s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-marquee { animation: none !important; }
        }
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
