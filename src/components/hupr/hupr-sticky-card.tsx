// HUPR sticky-card primitive — drop into any page's main flow to get the
// signature service-stack visual: colored full-bleed band that sticks at
// `top: index * 60px` so subsequent cards stack on top as you scroll.
//
// Pattern was first shipped on /drills (3 cards: math / behavioral / recovery)
// and now used across cases, dashboard, debrief, cheatsheet.
//
// Cards self-position via `position: sticky; top: <offset>`. No JS scroll
// math — relies on parent NOT having `overflow: hidden`.
//
// Usage:
//   <HuprStickyCardStack>
//     <HuprStickyCard index={0} bg="var(--hupr-sand)" eyebrow="01" title="…" body="…" cta={{label, href}} photo="/foo.jpg" />
//     <HuprStickyCard index={1} bg="var(--hupr-terra)" ...>{children}</HuprStickyCard>
//   </HuprStickyCardStack>
//
// `children` overrides body/photo/cta — useful when the card needs to
// embed something custom (a leaderboard widget, a streak grid, etc.).

import type { ReactNode } from 'react';

export function HuprStickyCardStack({ children }: { children: ReactNode }) {
  return <section className="relative">{children}</section>;
}

export interface HuprStickyCardProps {
  index: number;
  bg: string;                  // CSS color (var or hex)
  fg?: string;                 // foreground text color, default white
  eyebrow?: string;
  title: string;
  body?: string;
  photo?: string;              // optional /public/* path or full URL
  cta?: { label: string; href: string };
  children?: ReactNode;        // overrides body/photo/cta layout
  minHeight?: string;          // default 60vh
  topOffset?: number;          // default index * 60
  href?: string;               // wraps whole card in <a>
}

export function HuprStickyCard({
  index,
  bg,
  fg = '#FFFFFF',
  eyebrow,
  title,
  body,
  photo,
  cta,
  children,
  minHeight = '60vh',
  topOffset,
  href,
}: HuprStickyCardProps) {
  const top = topOffset ?? index * 60;

  const inner = (
    <div className="px-6 sm:px-12 py-12 lg:py-16 h-full flex flex-col">
      <div className="flex-grow">
        {eyebrow && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: fg,
              opacity: 0.85,
            }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          className="uppercase mt-3"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 'clamp(48px, 9vw, 144px)',
            lineHeight: 0.95,
            color: fg,
            margin: 0,
            maxWidth: '70%',
          }}
        >
          {title}
        </h2>
      </div>

      {/* Children override the default body/photo/cta layout. */}
      {children ? (
        <div className="mt-8" style={{ color: fg }}>
          {children}
        </div>
      ) : (
        <div className="lg:flex items-end gap-12 mt-8 lg:mt-0">
          {photo && (
            <div className="w-full lg:w-3/12">
              <div className="overflow-hidden" style={{ aspectRatio: '4 / 2.8' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="hupr-image-zoom w-full h-full object-cover"
                  style={{ filter: 'saturate(0.9)' }}
                />
              </div>
            </div>
          )}
          {body && (
            <div className={`w-full ${photo ? 'lg:w-7/12 lg:pl-12' : 'lg:w-9/12'} mt-6 lg:mt-0`}>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: fg,
                  margin: 0,
                }}
              >
                {body}
              </p>
            </div>
          )}
          {cta && (
            <div className="w-full lg:w-2/12 mt-6 lg:mt-0 flex lg:justify-end">
              <span
                className="hupr-anim-btn"
                style={{
                  background: '#FFFFFF',
                  color: bg,
                  padding: '12px 18px',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'inline-block',
                }}
              >
                <span className="top">{cta.label}</span>
                <span className="btm">{cta.label}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const cardStyle = {
    backgroundColor: bg,
    top,
    zIndex: index + 1,
    minHeight,
  } as const;

  if (href) {
    return (
      <a
        href={href}
        className="sticky block transition-opacity hover:opacity-95"
        style={{ ...cardStyle, textDecoration: 'none' }}
      >
        {inner}
      </a>
    );
  }
  return (
    <article className="sticky block" style={cardStyle}>
      {inner}
    </article>
  );
}
