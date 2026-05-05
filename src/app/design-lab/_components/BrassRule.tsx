'use client';

import { motion, useReducedMotion } from 'motion/react';

// 1px brass rule that draws in left-to-right. Used three times in Boardroom
// Brass: under the hero wordmark, as the arena progress bar, and under the
// debrief score divider.

type Props = {
  color: string;
  width?: string | number;
  height?: number;
  delay?: number;
  duration?: number;
  /** When true, animates only when scrolled into view. */
  whileInView?: boolean;
  /** For progress-style use: stops at this fraction of the width. */
  progressTo?: number;
};

export function BrassRule({
  color,
  width = '100%',
  height = 1,
  delay = 0,
  duration = 0.48,
  whileInView,
  progressTo,
}: Props) {
  const reduced = useReducedMotion();
  const finalScale = progressTo ?? 1;

  const animateProps = reduced
    ? { scaleX: finalScale }
    : { scaleX: finalScale };
  const initialProps = reduced ? { scaleX: finalScale } : { scaleX: 0 };

  return (
    <motion.div
      initial={initialProps}
      {...(whileInView
        ? { whileInView: animateProps, viewport: { once: true, amount: 0.3 } }
        : { animate: animateProps })}
      transition={{ duration, delay, ease: 'easeOut' }}
      style={{
        width,
        height,
        background: color,
        transformOrigin: 'left center',
      }}
    />
  );
}
