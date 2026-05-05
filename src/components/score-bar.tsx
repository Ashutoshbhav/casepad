'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SPRING, EASE, INSTANT } from '@/lib/motion-tokens';

// Rubric bar with stagger entrance.
//
// IMPORTANT: animating `width` triggers layout (not GPU). We render the
// fill at full width and scaleX from 0 → pct/100 with `transform-origin:
// left` so the bar grows on the GPU. Visually identical, frame-accurate.
export function ScoreBar({
  label,
  value,
  max,
  staggerIndex = 0,
  startDelay = 0,
}: {
  label: string;
  value: number;
  max: number;
  staggerIndex?: number;
  startDelay?: number;
}) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const scaleTarget = pct / 100;
  const fillColor =
    pct >= 75
      ? 'var(--color-accent-bright, var(--color-accent))'
      : pct >= 50
        ? 'var(--color-accent)'
        : 'var(--color-text-muted)';
  const delay = startDelay + staggerIndex * 0.08;

  return (
    <motion.div
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? INSTANT : { ...SPRING.smooth, delay }}
    >
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--color-text-primary)' }}>
          {value}/{max}
        </span>
      </div>
      <div
        className="h-2 rounded overflow-hidden"
        style={{ background: 'var(--color-bg-sunken)' }}
      >
        <motion.div
          initial={reduced ? { scaleX: scaleTarget } : { scaleX: 0 }}
          animate={{ scaleX: scaleTarget }}
          transition={
            reduced
              ? INSTANT
              : { duration: 0.5, delay: delay + 0.1, ease: EASE.expo }
          }
          className="h-full origin-left"
          style={{
            background: fillColor,
            width: '100%',
            transformOrigin: 'left center',
            willChange: 'transform',
          }}
        />
      </div>
    </motion.div>
  );
}
