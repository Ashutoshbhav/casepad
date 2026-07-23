'use client';

// Home page hero — distinct marketing layout. Replaces HuprDesign's
// signin-shaped Hero (marquee + photo + floating right-card) with a
// centered editorial composition:
//
//   - Full-bleed boardroom photo (cycles every 4s)
//   - Top eyebrow: cohort tagline + Plex Mono
//   - HUGE centered Montserrat 700 title: "The Room Before the Room"
//   - Subhead paragraph
//   - Dual CTAs: Sign In to Begin (dark fill) + See How It Works (ghost)
//   - No marquee, no floating card — clean marketing surface
//
// Used by `/` (home). NOT used by /auth/signin — that page keeps the
// HuprDesign default Hero with the form in the right-card slot.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const HERO_PHOTOS = [
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=80',
];

export function HomeHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % HERO_PHOTOS.length),
      4000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden"
      style={{
        height: '100vh',
        minHeight: 720,
      }}
    >
      {/* Photo crossfade — same 3 boardroom shots HUPR cycles. Slightly
          stronger gradient overlay than the default Hero so the centered
          text reads cleanly without a card behind it. */}
      <div className="absolute inset-0">
        {HERO_PHOTOS.map((url, i) => (
          <div
            key={url}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              backgroundPosition: '50% 50%',
              opacity: active === i ? 1 : 0,
              transition: 'opacity 1.2s cubic-bezier(.3,.86,.36,.95)',
              filter: 'brightness(0.7) saturate(0.9)',
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,20,21,0.55) 0%, rgba(20,20,21,0.30) 40%, rgba(20,20,21,0.30) 60%, rgba(20,20,21,0.65) 100%)',
          }}
        />
      </div>

      {/* Centered editorial composition. Max-width keeps the title
          readable at desktop breakpoints. */}
      <div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 sm:px-12"
        style={{ color: '#FFFFFF' }}
      >
        <span
          className="hupr-mono-eyebrow"
          style={{
            color: 'rgba(255,255,255,0.85)',
            marginBottom: 16,
          }}
        >
          Cohort case prep · Live since 2026
        </span>
        <hr
          style={{
            border: 0,
            borderTop: '1px solid rgba(255,255,255,0.4)',
            width: 96,
            margin: '0 0 32px',
          }}
        />
        <h1
          className="uppercase"
          style={{
            fontFamily: 'var(--font-hupr-display)',
            fontWeight: 700,
            fontSize: 'clamp(48px, 9vw, 144px)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            margin: 0,
            maxWidth: '20ch',
          }}
        >
          The room before the room.
        </h1>
        <p
          className="mt-8 max-w-[60ch]"
          style={{
            fontFamily: 'var(--font-hupr-body)',
            fontSize: 17,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.92)',
            margin: '32px auto 0',
          }}
        >
          1,165 real cases. A voice-first AI interviewer who talks back,
          pushes back, and scores every rep. A cohort of 12 schools
          rehearsing together. Speak — no safety net, no editing, the same
          pressure as the real room.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/auth/signin"
            className="hupr-anim-btn"
            style={{
              display: 'inline-block',
              background: '#FFFFFF',
              color: '#141415',
              padding: '16px 28px',
              borderRadius: 6,
              fontFamily: 'var(--font-hupr-body)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Sign in to begin →
          </Link>
          <Link
            href="#tracks"
            className="hupr-anim-btn"
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: '#FFFFFF',
              padding: '16px 28px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-hupr-body)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            See how it works
          </Link>
        </div>
      </div>

      {/* Bottom-edge hairline — small editorial detail to mark the
          fold. Helps the eye anchor at the photo's lower frame. */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          bottom: '4vh',
          margin: '0 auto',
          width: 'min(960px, 80vw)',
          height: 1,
          background: 'rgba(255,255,255,0.35)',
        }}
        aria-hidden="true"
      />
    </section>
  );
}
