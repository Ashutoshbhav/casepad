'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AshMark } from './ash-mark';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';
import { SPRING, EASE, INSTANT } from '@/lib/motion-tokens';

// Debrief score reveal. Sequence — each step driven by motion/react's
// declarative `animate` prop with derived target values (no rAF, no
// setTimeout chains fighting each other):
//
//   t=0     mark mounts at scale 1, opacity 1
//   t=600ms `revealed` → mark scales to 2.2 / opacity 0.35,
//                        score scales to 1 / opacity 1
//
// All transforms, no width/height. Reduced-motion users get the static
// final composition. Two motion.div siblings, one transition each — no
// race conditions because both watch the same `revealed` boolean.

export function ScoreReveal({
  score,
  outOf = 100,
}: {
  score: number;
  outOf?: number;
}) {
  // Defensive: callers SHOULD pass a number, but a malformed session row
  // (no score column, NaN, etc.) shouldn't tip the page into error.tsx.
  const safeScore = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState<boolean>(Boolean(reduced));

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    const id = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(id);
  }, [reduced]);

  // Pick the asterisk reaction based on score band:
  //   ≥75 → celebrating (existing big burst — 1.5s)
  //   60–74 → approving (warm pulse — 1.5s)
  //   <60 → concerned (the "we'll work on it" expression — 2.0s)
  // The useFrame loop auto-reverts these timed states to idle, but we
  // also clear on unmount so the next route doesn't inherit the burst.
  useEffect(() => {
    if (reduced) return;
    let setAiState: ReturnType<typeof useAsteriskSceneStore.getState>['setAiState'] | null = null;
    try {
      setAiState = useAsteriskSceneStore.getState().setAiState;
    } catch (e) {
      console.warn('[score-reveal] store getState failed:', e);
      return;
    }
    const reaction: 'celebrating' | 'approving' | 'concerned' =
      safeScore >= 75 ? 'celebrating' : safeScore >= 60 ? 'approving' : 'concerned';
    const kick = setTimeout(() => {
      try {
        setAiState?.(reaction);
      } catch (e) {
        console.warn('[score-reveal] setAiState(reaction) failed:', e);
      }
    }, 600);
    return () => {
      clearTimeout(kick);
      // Defensive: if we unmount mid-reaction, force back to idle.
      try {
        setAiState?.('idle', { force: true });
      } catch (e) {
        console.warn('[score-reveal] setAiState(idle) failed:', e);
      }
    };
  }, [reduced, safeScore]);

  // The mark scales out FIRST (smooth spring, ~400ms perceived), then the
  // number arrives with the emphasis ease-out for a satisfying overshoot.
  // Race-prevention: number transition delays 0.45s so it lands after the
  // orb peak, not during the rise. Result: orb pops outward → number snaps
  // crisp into the cleared center, no overlap stutter.
  const markSpring = SPRING.smooth;
  const NUMBER_DELAY = 0.45;

  return (
    <div
      style={{
        position: 'relative',
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 1, opacity: 1 }}
        animate={
          reduced
            ? { scale: 2.2, opacity: 0.35 }
            : revealed
              ? { scale: 2.2, opacity: 0.35 }
              : { scale: 1, opacity: 1 }
        }
        transition={reduced ? INSTANT : markSpring}
        style={{ position: 'absolute', willChange: 'transform, opacity' }}
      >
        <AshMark size={96} />
      </motion.div>
      <motion.div
        initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        animate={
          revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
        }
        transition={
          reduced
            ? INSTANT
            : { duration: 0.4, delay: NUMBER_DELAY, ease: EASE.emphasis }
        }
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: 'var(--font-headline, ui-serif)',
          fontStyle: 'italic',
          fontSize: '120px',
          lineHeight: 1,
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.04em',
          willChange: 'transform, opacity',
        }}
      >
        {safeScore}
      </motion.div>
      <span className="meta-label absolute bottom-2">
        / {outOf}
      </span>
    </div>
  );
}
