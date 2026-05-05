'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AshMark } from './ash-mark';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';
import { SPRING, EASE, INSTANT } from '@/lib/motion-tokens';

// Count-up hook — drives the score number from 0 to target over `durationMs`
// once `start` flips true. Uses requestAnimationFrame, eased out so the
// count slows toward the final number (Apple Activity-ring pattern).
function useCountUp(target: number, start: boolean, durationMs: number, reduced: boolean): number {
  const [value, setValue] = useState<number>(reduced || start ? target : 0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    if (!start) return;
    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const elapsed = now - startedAtRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic — feels like the number "lands" instead of slamming.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startedAtRef.current = null;
    };
  }, [start, target, durationMs, reduced]);
  return value;
}

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

  // Count-up — score animates from 0 to target over ~900ms once revealed,
  // ease-out so it lands instead of slams. Apple Activity-ring pattern.
  // The cinematic moment cohort feedback was missing: the climax of the
  // case stops being a static price tag and becomes "you earned this".
  const displayedScore = useCountUp(safeScore, revealed, 900, Boolean(reduced));

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
          fontVariantNumeric: 'tabular-nums',
          willChange: 'transform, opacity',
        }}
      >
        {displayedScore}
      </motion.div>
      <span className="meta-label absolute bottom-2">
        / {outOf}
      </span>
    </div>
  );
}
