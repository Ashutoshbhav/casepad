'use client';

// Wave C: HUPR-flavor bottom marquee for production /dashboard, /cases,
// /debrief. Smaller + faster (16s loop, clamp 48-88px) than the v2
// proof-of-concept marquee — reads as a decorative ribbon at the
// bottom edge, not a competing headline.

import type { CSSProperties } from 'react';

export function HuprMarquee({
  text,
  variant = 'dark',
}: {
  text: string;
  variant?: 'dark' | 'light';
}) {
  const color = variant === 'dark' ? 'var(--color-text-primary)' : '#FFFFFF';
  const style: CSSProperties = {
    display: 'flex',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-headline, ui-serif)',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 'clamp(48px, 6vw, 88px)',
    lineHeight: 0.9,
    color,
    letterSpacing: '-0.012em',
    paddingBottom: 8,
    opacity: 0.88,
  };
  return (
    <div
      style={{
        overflow: 'hidden',
        pointerEvents: 'none',
        marginTop: 56,
      }}
    >
      <div className="hupr-marquee" style={style}>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} style={{ paddingRight: 80, flexShrink: 0 }}>
            {text}&nbsp;
          </span>
        ))}
      </div>
      <style>{`
        @keyframes hupr-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .hupr-marquee {
          animation: hupr-marquee 16s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hupr-marquee { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
