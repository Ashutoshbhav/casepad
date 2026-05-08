'use client';

// CasePadLogo — the brand mark with personality.
//
// A hand-drawn rough.js 8-petal asterisk (not a perfect SVG — every render
// is slightly different) paired with the "casepad" wordmark and a sketchy
// underline beneath it. On hover the asterisk does a 720° flip and the
// underline lengthens; the animation runs CSS-only, no JS.
//
// Used in the top-nav. AshMark stays untouched for the chat avatar / signin
// hero where the perfect-symmetric mark is correct.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

interface Props {
  size?: number;
  showUnderline?: boolean;
}

export function CasePadLogo({ size = 22, showUnderline = true }: Props) {
  const asteriskRef = useRef<SVGSVGElement>(null);
  const underlineRef = useRef<SVGSVGElement>(null);

  // Hand-draw the asterisk and the wordmark underline. roughjs makes
  // every render slightly different — that's the personality. We seed
  // the random with a fixed value so SSR + first client render don't
  // hydration-mismatch.
  useEffect(() => {
    const askSvg = asteriskRef.current;
    if (askSvg) {
      askSvg.innerHTML = '';
      askSvg.setAttribute('viewBox', `-12 -12 24 24`);
      askSvg.setAttribute('width', String(size));
      askSvg.setAttribute('height', String(size));
      const rc = rough.svg(askSvg);
      // 8 hand-drawn petal lines radiating from the center. Cardinal
      // (0/90/180/270) lines are slightly longer than diagonals — same
      // asymmetry as the original Anthropic-style asterisk, just sketchy.
      const petals = [
        { ang: 0,   len: 9.6 },
        { ang: 45,  len: 8.2 },
        { ang: 90,  len: 9.6 },
        { ang: 135, len: 8.2 },
        { ang: 180, len: 9.6 },
        { ang: 225, len: 8.2 },
        { ang: 270, len: 9.6 },
        { ang: 315, len: 8.2 },
      ];
      for (const p of petals) {
        const rad = (p.ang * Math.PI) / 180;
        const x2 = Math.cos(rad - Math.PI / 2) * p.len;
        const y2 = Math.sin(rad - Math.PI / 2) * p.len;
        const line = rc.line(0, 0, x2, y2, {
          stroke: 'currentColor',
          strokeWidth: 1.6,
          roughness: 1.4,
          bowing: 1.2,
          seed: 1 + p.ang, // stable-per-petal so it doesn't flicker on re-render
        });
        askSvg.appendChild(line);
      }
    }

    if (showUnderline) {
      const undSvg = underlineRef.current;
      if (undSvg) {
        const w = 88;
        const h = 8;
        undSvg.innerHTML = '';
        undSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        undSvg.setAttribute('width', String(w));
        undSvg.setAttribute('height', String(h));
        const rc = rough.svg(undSvg);
        const line = rc.line(2, h / 2, w - 2, h / 2, {
          stroke: 'currentColor',
          strokeWidth: 1.4,
          roughness: 1.6,
          bowing: 1.8,
          seed: 42,
        });
        undSvg.appendChild(line);
      }
    }
  }, [size, showUnderline]);

  return (
    <span
      className="casepad-logo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        color: 'var(--color-text-primary)',
      }}
    >
      <span
        className="casepad-logo__mark"
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          flexShrink: 0,
          color: 'var(--color-text-primary)',
        }}
        aria-hidden="true"
      >
        <svg ref={asteriskRef} width={size} height={size} style={{ overflow: 'visible' }} />
      </span>
      <span
        className="casepad-logo__word"
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          casepad
        </span>
        {showUnderline && (
          <span
            className="casepad-logo__underline"
            style={{
              display: 'inline-block',
              marginTop: 2,
              color: 'var(--color-text-primary)',
              opacity: 0.55,
            }}
            aria-hidden="true"
          >
            <svg ref={underlineRef} width={88} height={8} style={{ display: 'block' }} />
          </span>
        )}
      </span>
      <style jsx>{`
        .casepad-logo .casepad-logo__mark {
          transform-origin: 50% 50%;
          transition: transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .casepad-logo:hover .casepad-logo__mark {
          transform: rotate(360deg);
        }
        .casepad-logo .casepad-logo__underline {
          transform-origin: 0 50%;
          transform: scaleX(0.85);
          transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1),
                      opacity 320ms cubic-bezier(0.32, 0.72, 0, 1);
        }
        .casepad-logo:hover .casepad-logo__underline {
          transform: scaleX(1.04);
          opacity: 0.85;
        }
        @media (prefers-reduced-motion: reduce) {
          .casepad-logo .casepad-logo__mark,
          .casepad-logo .casepad-logo__underline {
            transition: none;
            transform: none !important;
          }
        }
      `}</style>
    </span>
  );
}
