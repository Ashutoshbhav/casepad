// Shared HUPR-style masthead for v2 type-mode pages.
//
// Black-on-cream variant of the wordmark + MENU pill that appears on
// /signin in white-on-photo. Used by dashboard / cases / solve /
// debrief — keeps the language unified across the v2 system.

import type { CSSProperties } from 'react';

export function Masthead({
  caption,
  variant = 'dark',
}: {
  caption?: [string, string, string];
  variant?: 'dark' | 'light';
}) {
  const ink = variant === 'dark' ? 'rgb(50,50,52)' : '#FFFFFF';
  const pillBg = variant === 'dark' ? 'rgb(50,50,52)' : '#E8E8E5';
  const pillInk = variant === 'dark' ? '#FFFFFF' : 'rgb(50,50,52)';
  const captionLines = caption ?? ['Practice', 'Centre for', 'Consulting Cases'];

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '32px 36px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '0.04em',
            color: ink,
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
            color: ink,
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
            color: ink,
            letterSpacing: '0.02em',
            paddingLeft: 6,
          }}
        >
          {captionLines[0]}<br />
          {captionLines[1]}<br />
          {captionLines[2]}
        </span>
      </div>
      <button
        type="button"
        style={{
          width: 'min(280px, 24vw)',
          background: pillBg,
          border: 'none',
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
            color: pillInk,
            letterSpacing: '0.02em',
          }}
        >
          MENU
        </span>
        <span
          aria-hidden="true"
          style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}
        >
          <span style={{ display: 'block', width: 22, height: 1, background: pillInk }} />
          <span style={{ display: 'block', width: 22, height: 1, background: pillInk }} />
        </span>
      </button>
    </header>
  );
}

export function SectionEyebrow({
  label,
  meta,
}: {
  label: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '16px 36px',
        borderBottom: '1px solid rgba(0,0,0,0.18)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-v2-mono)',
          fontWeight: 500,
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgb(50,50,52)',
        }}
      >
        {label}
      </span>
      {meta && (
        <span
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontWeight: 400,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(50,50,52,0.65)',
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

export function Marquee({
  text,
  variant = 'dark',
}: {
  text: string;
  variant?: 'dark' | 'light';
}) {
  const color = variant === 'dark' ? 'rgb(50,50,52)' : '#FFFFFF';
  const style: CSSProperties = {
    display: 'flex',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-v2-display)',
    fontWeight: 700,
    fontSize: 'clamp(110px, 14vw, 192px)',
    lineHeight: 0.9,
    color,
    letterSpacing: '-0.012em',
    paddingBottom: 12,
  };
  return (
    <div
      style={{
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div className="v2-marquee" style={style}>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} style={{ paddingRight: 80, flexShrink: 0 }}>
            {text}&nbsp;
          </span>
        ))}
      </div>
      <style>{`
        @keyframes v2-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .v2-marquee {
          animation: v2-marquee 36s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-marquee { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
