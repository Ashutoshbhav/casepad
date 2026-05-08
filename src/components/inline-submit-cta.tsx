'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SubmitForScoringButton } from './submit-for-scoring-button';
import { DURATION, EASE } from '@/lib/motion-tokens';

// InlineSubmitCTA — the bottom-of-chat "Ready to wrap?" block.
//
// Visibility rules (owned by the parent so this component stays a dumb view):
//   - render only when messageCount >= 6 (3 turns each)
//   - parent must hide it when streaming or when `ended === true`
//
// At messageCount >= 10 the copy switches to the "Ash thinks you've covered
// the case…" line and the button gets a single 1s pulse drawing attention.
// After that one pulse the block stays static — never pushy.

type Props = {
  sessionId: string;
  endSessionAction: () => Promise<void> | void;
  messageCount: number;
};

export function InlineSubmitCTA({ sessionId, endSessionAction, messageCount }: Props) {
  const reduced = useReducedMotion();
  const isLate = messageCount >= 10;

  // Pulse only fires once, the first time the user crosses turn 10. We use
  // motion's keyframes array on `scale`; reduced-motion clients skip it.
  const pulseAnim =
    isLate && !reduced
      ? { scale: [1, 1.04, 1] }
      : { scale: 1 };

  const copy = isLate
    ? "Ash thinks you've covered the case. Ready to wrap?"
    : 'Ready to wrap? Submit when you’ve delivered your recommendation.';

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.smooth, ease: EASE.expo }}
      className="mx-4 sm:mx-6 mb-2 mt-1 px-4 py-3 flex flex-wrap items-center gap-3 justify-between"
      style={{
        background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border)',
      }}
      aria-live="polite"
    >
      <p
        className="text-sm leading-snug flex-1 min-w-[200px]"
        style={{
          fontFamily: 'var(--font-accent)',
          color: 'var(--color-text-primary)',
        }}
      >
        {copy}
      </p>
      <motion.div
        animate={pulseAnim}
        transition={{
          duration: 1,
          ease: EASE.expo,
          // Single pulse — no repeat. After the keyframes finish, motion
          // settles back to scale: 1 and the block stays static.
        }}
        style={{ display: 'inline-block', willChange: 'transform' }}
      >
        <SubmitForScoringButton
          sessionId={sessionId}
          endSessionAction={endSessionAction}
          variant="inline"
        />
      </motion.div>
    </motion.div>
  );
}
