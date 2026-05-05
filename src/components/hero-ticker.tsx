'use client';

import { useReducedMotion } from 'motion/react';

// HeroTicker — horizontal infinite-scroll ticker rendering real case
// titles. DOM-level (NOT WebGL) so the asterisk constellation behind it
// is unaffected. Lives at the bottom of the signin top-viewport hero.
//
// Goals:
//   - Show real library content density without forcing a scroll.
//   - 6-8 real case titles drifting left at ~20px/sec desktop, ~28 mobile.
//   - CSS-only loop (translateX + duplicate the list); no JS rAF.
//   - Pauses on hover (subtle UX nicety).
//   - aria-hidden — decorative; the heading + subtitle already convey
//     intent to assistive tech.
//   - Reduced motion: animation paused entirely; only first 3 items shown
//     so we don't dump a long static list of titles into the viewport.

// Real case titles — sourced from src/lib/starter-cases.ts (DB rows).
// School + year strings match what the existing CasesPreviewSection uses
// for the 3 featured cases ("HARVARD · 2019", "IVEY · 2021",
// "DARDEN · 2018"). Other casebooks (Kellogg, Wharton, Ross) are common
// real source schools for the remaining starter cases.
const TICKER_ITEMS: ReadonlyArray<{ title: string; school: string; year: string }> = [
  { title: 'Estimating Instagram Photo Uploads', school: 'HARVARD', year: '2019' },
  { title: 'DigiBooks Tablet Launch', school: 'IVEY', year: '2021' },
  { title: 'Precious Metals South America Expansion', school: 'DARDEN', year: '2018' },
  { title: 'Match My Doll Clothes Expansion', school: 'KELLOGG', year: '2020' },
  { title: 'Whisky Brand Turnaround', school: 'WHARTON', year: '2017' },
  { title: 'Zephyr Beverages Operations', school: 'ROSS', year: '2019' },
  { title: 'American Beauty Company Go-to-Market', school: 'BOOTH', year: '2018' },
  { title: 'Clothing Chain Acquisition', school: 'TUCK', year: '2020' },
];

export function HeroTicker() {
  const reduced = useReducedMotion();

  // Reduced-motion: render a non-animated, abbreviated list (first 3).
  // Keeps semantic content visible without burning CPU on a marquee for
  // users who explicitly opted out of motion.
  if (reduced) {
    return (
      <div
        className="hero-ticker hero-ticker--reduced"
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          display: 'flex',
          gap: '2.5rem',
          justifyContent: 'center',
          width: '100%',
          padding: '0.5rem 1rem',
        }}
      >
        {TICKER_ITEMS.slice(0, 3).map((it) => (
          <span key={it.title}>
            {it.title} · {it.school} · {it.year}
          </span>
        ))}
      </div>
    );
  }

  // The list is duplicated so the `translateX(-50%)` keyframe seamlessly
  // wraps. Each child is a `<li>` with a small fixed gap; the parent track
  // is `display:inline-flex` so width = sum of children. Hovering the
  // wrapper pauses the animation.
  return (
    <div
      className="hero-ticker"
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        maskImage:
          'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
      }}
    >
      <ul className="hero-ticker__track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((it, idx) => (
          <li key={`${it.title}-${idx}`} className="hero-ticker__item">
            <span className="hero-ticker__title">{it.title}</span>
            <span className="hero-ticker__sep">·</span>
            <span className="hero-ticker__school">{it.school}</span>
            <span className="hero-ticker__sep">·</span>
            <span className="hero-ticker__year">{it.year}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .hero-ticker__track {
          display: inline-flex;
          gap: 3rem;
          padding: 0.5rem 0;
          margin: 0;
          list-style: none;
          white-space: nowrap;
          /* Animate the duplicated track from 0 to -50% so the seam wraps
             invisibly (the second half is identical to the first half,
             which has just scrolled off-screen). */
          animation: hero-ticker-scroll 90s linear infinite;
          will-change: transform;
        }
        .hero-ticker:hover .hero-ticker__track {
          animation-play-state: paused;
        }
        .hero-ticker__item {
          display: inline-flex;
          gap: 0.6rem;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .hero-ticker__title {
          color: color-mix(in oklab, var(--color-text-secondary) 80%, transparent);
        }
        .hero-ticker__sep {
          opacity: 0.5;
        }
        @keyframes hero-ticker-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @media (max-width: 768px) {
          .hero-ticker__track {
            gap: 2rem;
            /* Mobile: shorter screen, faster speed (~28px/sec) and smaller
               font so more titles fit in the visual band. */
            animation-duration: 60s;
          }
          .hero-ticker__item {
            font-size: 10px;
            letter-spacing: 0.14em;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-ticker__track {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
