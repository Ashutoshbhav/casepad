'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AshMark } from './ash-mark';
import { SplitText } from './split-text';
import { useAsteriskScene } from '@/hooks/use-asterisk-scene';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';
import { SPRING, EASE, DURATION, INSTANT } from '@/lib/motion-tokens';

// Sign-in hero — Lusion-grade build (revised 2026-05-04 — landing pass).
//
// The 3D coral asterisk lives once at the layout level (<PersistentAsterisk />)
// and is sized/positioned by Zustand presets. This module now:
//   1. Registers the 'signin' preset via `SignInSceneRegister`.
//   2. Pumps native scroll position (normalized over the full document
//      scroll range, NOT just the first viewport) into the store as
//      scrollProgress 0..1. The persistent canvas reads it for
//      rotation×, scale ramp, and particle drift — those stay
//      bidirectional with scroll, by design.
//   3. Exports three editorial reveal components that the signin page
//      interleaves with the new content sections (what-is / cases-preview /
//      how-it-works / founder / faq / footer). Each reveal is a full
//      viewport (`min-h-screen`) and latches ONE-WAY: once a line is
//      revealed, scrolling back up does NOT un-reveal it.
//      Tracked via per-line `useState<boolean>` flipped true and never
//      back. Refresh-mid-scroll: on mount, if the current scroll is
//      already past a threshold, the line shows up immediately.
//
// Layout choice: the editorial copy is rendered as three full-viewport
// scroll sections BELOW the sign-in form. The form itself lives at the
// top of the page in `signin/page.tsx`. Scroll thresholds are tuned for
// the new ~900vh page (form + 3 reveals + 6 content sections + footer).
//
// Reduced-motion / no-WebGL2: the persistent canvas skips itself in
// those cases, so we fall back to the small 2D <AshMark> here. Reduced-
// motion users see the full copy immediately (no scroll gating).

// Tiny island — runs the per-route hook to register signin preset on the
// persistent canvas. Pure side-effect, renders nothing.
export function SignInSceneRegister() {
  useAsteriskScene('signin');
  return null;
}

// useScrollProgress — observes window scroll, writes 0..1 to store.
//
// Important: progress is computed against (scrollHeight - viewportHeight),
// not just viewportHeight. The page is now ~900vh tall (form + 3 editorial
// reveals + 6 content sections + footer) so we want progress to span the
// entire scrollable distance. Otherwise the canvas would max out its
// choreography at 1×viewport in, and the latter half of the page would
// feel static.
function useScrollProgress() {
  const setScrollProgress = useAsteriskSceneStore((s) => s.setScrollProgress);
  const reduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setScrollProgress(0);
      return;
    }

    const compute = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const doc = document.documentElement;
      const range = Math.max(1, (doc.scrollHeight || 0) - (window.innerHeight || 0));
      const p = y / range;
      pendingRef.current = p < 0 ? 0 : p > 1 ? 1 : p;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setScrollProgress(pendingRef.current);
          rafRef.current = null;
        });
      }
    };

    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setScrollProgress(0);
    };
  }, [reduced, setScrollProgress]);
}

// SignInScrollProgressMount — extracted so the page can mount the scroll
// observer ONCE near the top of the tree, independent of which editorial
// reveal renders. (Previously useScrollProgress was inside SignInHero, so
// splitting SignInHero across multiple page slots would have meant
// multiple observers fighting each other or none at all.) Renders nothing.
export function SignInScrollProgressMount() {
  useScrollProgress();
  return null;
}

// useOneWayReveal — flips a boolean true once scrollProgress crosses
// `threshold`, and NEVER flips back. This is the bug-fix: previously
// reveal state was a derived expression (scrollProgress > threshold),
// so scrolling back up would un-reveal. Now we latch.
//
// On mount, if scrollProgress is already past threshold (refresh
// mid-scroll, back-nav, anchor links, etc.), set true immediately so
// users don't have to scroll up and back to see the line.
function useOneWayReveal(threshold: number, force?: boolean): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (force) {
      setRevealed(true);
      return;
    }
    // Initial check — restore from current scroll on mount.
    const initial = useAsteriskSceneStore.getState().scrollProgress;
    if (initial > threshold) {
      setRevealed(true);
      return;
    }
    // Subscribe; flip once, then unsubscribe.
    const unsub = useAsteriskSceneStore.subscribe((state) => {
      if (state.scrollProgress > threshold) {
        setRevealed(true);
        unsub();
      }
    });
    return unsub;
  }, [threshold, force]);

  return revealed;
}

// useIs3DEligible — small helper for the 2D fallback. Returns true once
// we've confirmed WebGL2 is available; reduced-motion users always get
// false (so they get the 2D mark and skip the persistent canvas chunk).
function useIs3DEligible(): boolean {
  const reduced = useReducedMotion();
  const [is3DEligible, setIs3DEligible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduced) return;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) setIs3DEligible(true);
    } catch {
      // WebGL2 unsupported — keep 2D fallback
    }
  }, [reduced]);
  return is3DEligible;
}

// useIs3DTextEligible — returns true when the persistent canvas will be
// rendering the troika 3D hero text. That requires WebGL2 + non-mobile
// viewport + non-reduced-motion. When false, the DOM <h1> tagline renders
// in its place (mobile, no-WebGL2, reduced-motion).
function useIs3DTextEligible(): boolean {
  const reduced = useReducedMotion();
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduced) {
      setEligible(false);
      return;
    }
    const compute = () => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2');
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        setEligible(!!gl && !isMobile);
      } catch {
        setEligible(false);
      }
    };
    compute();
    const mq = window.matchMedia('(max-width: 768px)');
    mq.addEventListener('change', compute);
    return () => mq.removeEventListener('change', compute);
  }, [reduced]);
  return eligible;
}

// SignInHeroTagline — always-visible DOM headline. Big italic display
// type, the visual anchor of the hero. Aria-hidden because the page
// also renders a parallel sr-only <h1> for screen readers + SEO.
export function SignInHeroTagline() {
  return (
    <div
      aria-hidden="true"
      className="font-headline italic"
      style={{
        color: 'var(--color-text-primary)',
        fontSize: 'clamp(40px, 6vw, 72px)',
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
      }}
    >
      the room
      <br />
      before the room.
    </div>
  );
}

// ---------------------------------------------------------------------
// Reveal thresholds — tuned for a ~900vh page (form + 3 reveals + 6
// content sections + footer). With scrollProgress normalized over
// (scrollHeight - vh), and assuming each viewport ≈ 100vh:
//
//   Layout vertical position (cumulative top):
//     form              0vh
//     reveal 1        100vh  (line emerges as form leaves)
//     section 3       200vh  (what is)
//     reveal 2        300vh
//     section 4       400vh  (cases preview)
//     reveal 3        500vh
//     section 5       600vh  (how it works)
//     section 6       700vh  (founder)
//     section 7       800vh  (faq)
//     footer          900vh
//
//   Scrollable range ≈ 810vh. Threshold to fire when reveal section is
//   ~mid-viewport: top + 50vh, divided by 810vh.
//     reveal 1 mid:  150 / 810 ≈ 0.185 — keep slight pre-fire 0.10
//     reveal 2 mid:  350 / 810 ≈ 0.432
//     reveal 3 mid:  550 / 810 ≈ 0.679
//
//   These are tuned-by-feel; adjust if the rhythm feels off.
// ---------------------------------------------------------------------
// Tighter thresholds — page collapsed from ~900vh to ~400-450vh after
// switching sections from min-h-screen to py-20. Reveals must fire as
// each section enters viewport, not 40-70% deep into the scroll range.
const REVEAL_THRESHOLDS = {
  line1: 0.08,
  line2: 0.30,
  line3: 0.55,
} as const;

// ---------------------------------------------------------------------
// Editorial reveal sections — three full-viewport panels, each with
// one reveal line. The page interleaves them with content sections.
// ---------------------------------------------------------------------

export function SignInEditorialReveal1() {
  const reduced = useReducedMotion();
  const is3DEligible = useIs3DEligible();
  const line1Revealed = useOneWayReveal(REVEAL_THRESHOLDS.line1, reduced ?? undefined);

  return (
    <section
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-24"
    >
      <div className="max-w-2xl">
        {/* 2D fallback — only when the persistent 3D canvas is NOT eligible. */}
        {!is3DEligible && (
          <motion.div
            initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? INSTANT : SPRING.smooth}
            className="mb-8"
          >
            <AshMark size={88} state="idle" />
          </motion.div>
        )}

        {/* Wordmark — small label, top-left of the editorial stack */}
        <motion.span
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? INSTANT : { ...SPRING.smooth, delay: 0.1 }}
          className="mb-6 block"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'var(--color-text-primary)',
          }}
        >
          casepad
        </motion.span>

        <SplitText
          text="the room before the room."
          stagger={28}
          revealed={line1Revealed}
          className="font-headline text-4xl italic leading-[1.05] sm:text-5xl md:text-[64px]"
          style={{ color: 'var(--color-text-primary)', display: 'block' }}
        />
      </div>
    </section>
  );
}

export function SignInEditorialReveal2() {
  const reduced = useReducedMotion();
  const line2Revealed = useOneWayReveal(REVEAL_THRESHOLDS.line2, reduced ?? undefined);

  return (
    <section
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-24"
    >
      <div className="max-w-2xl">
        <SplitText
          text="rehearse like it's real."
          stagger={26}
          revealed={line2Revealed}
          className="font-headline text-3xl italic leading-[1.05] sm:text-4xl md:text-[48px]"
          style={{
            color: 'color-mix(in oklab, var(--color-text-primary) 88%, transparent)',
            display: 'block',
          }}
        />
      </div>
    </section>
  );
}

export function SignInEditorialReveal3() {
  const reduced = useReducedMotion();
  const line3Revealed = useOneWayReveal(REVEAL_THRESHOLDS.line3, reduced ?? undefined);

  return (
    <section
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-24"
    >
      <div className="max-w-2xl">
        <SplitText
          text="ASH listens."
          stagger={32}
          revealed={line3Revealed}
          className="font-headline text-2xl italic leading-[1.05] sm:text-3xl md:text-[40px]"
          style={{ color: 'var(--color-accent-bright)', display: 'block' }}
        />
        <motion.p
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={line3Revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={
            reduced
              ? INSTANT
              : { duration: DURATION.smooth, delay: 0.4, ease: EASE.expo }
          }
          className="mt-8 max-w-md text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Cohort case-prep. Real cases, structured solving, instant feedback.
        </motion.p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// SignInHero — back-compat wrapper. Renders all three reveals stacked
// (legacy "all editorial in one block" behaviour). The new landing
// flow uses the individual reveals interleaved with content sections,
// and does NOT use this wrapper. Kept exported so any other caller (or
// a quick rollback path) still works.
// ---------------------------------------------------------------------

export function SignInHero() {
  return (
    <>
      <SignInScrollProgressMount />
      <SignInEditorialReveal1 />
      <SignInEditorialReveal2 />
      <SignInEditorialReveal3 />
    </>
  );
}
