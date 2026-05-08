'use client';

import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion-tokens';

// 6 small particles fly from input toward the orb avatar. Lifted from
// design-lab/liquid-tutor/ArenaPreview.tsx, adapted to use absolute pixel
// offsets relative to a parent container (chat-panel uses pointer-events:
// none so the disperse never blocks send).
//
// Caller mounts this for ~700ms then unmounts. Reduced-motion users render
// nothing (the chat send isn't gated on the animation, just a flourish).

// HUPR mono — particles fly in #323234 ink, no coral. Glow uses ink at 35%.
const ASH_COLOR = '#323234';
const ASH_GLOW = 'rgba(50, 50, 52, 0.35)';

export function DisperseParticles({
  fromX,
  fromY,
  toX,
  toY,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: fromX + (i - 2.5) * 8,
            y: fromY,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: toX,
            y: toY,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.03,
            ease: EASE.expo,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ASH_COLOR,
            boxShadow: `0 0 8px ${ASH_GLOW}`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
