'use client';

import { motion, useReducedMotion } from 'motion/react';
import { INSTANT } from '@/lib/motion-tokens';

// AshMark — CasePad's identity element. The Anthropic-asterisk: an
// 8-petal radiant mark with elongated tear-drop petals from the center.
// Slight asymmetry between cardinals (0/90/180/270) and diagonals
// (45/135/225/315) gives it the hand-drawn warmth of the Anthropic mark
// without copying the proprietary art directly.
//
// Motion is intentionally restrained:
//   - idle:     +/-3deg sway over 6s (sine-eased), no continuous spin
//   - thinking: 3s sway + 1.5s scale pulse (1.0 → 1.06 → 1.0)
//
// Only `transform` is animated — never path / width / height. Single SVG
// rendered through motion.div so the GPU does the work. Origin sits at
// the geometric center of the 24x24 viewBox so rotation reads clean.

type Props = {
  size?: number;
  state?: 'idle' | 'thinking';
  className?: string;
};

// Petal geometry. Each petal is a tear-drop drawn vertically pointing UP
// (negative-Y in SVG), then rotated to its angle. Cardinal petals are
// slightly longer (length 9.6) than diagonals (length 8.4), giving the
// mark its characteristic asymmetric warmth. Width tapers from 1.5 at
// the base to a soft point at the tip, with a subtle outward bulge near
// 70% so each petal reads as a stroke not a triangle.
//
// Path: starts at center (0,0), curves out to one shoulder near the tip,
// rounds the tip, comes back down the other shoulder, returns to center.
// Drawn once, rotated 8 times. The Q control points produce the bulge.
function petalPath(length: number): string {
  const baseHalfWidth = 0.75;          // 1.5px wide at base
  const shoulderY = -length * 0.7;     // outward bulge happens here
  const shoulderX = 0.55;              // bulge radius (slightly < base)
  const tipY = -length;
  return [
    `M 0 0`,
    `Q ${baseHalfWidth} ${shoulderY * 0.4} ${shoulderX} ${shoulderY}`,
    `Q ${shoulderX * 0.6} ${tipY} 0 ${tipY}`,
    `Q ${-shoulderX * 0.6} ${tipY} ${-shoulderX} ${shoulderY}`,
    `Q ${-baseHalfWidth} ${shoulderY * 0.4} 0 0`,
    `Z`,
  ].join(' ');
}

const CARDINAL_PETAL = petalPath(9.6);
const DIAGONAL_PETAL = petalPath(8.4);

const PETALS: { angle: number; path: string }[] = [
  { angle: 0,   path: CARDINAL_PETAL },
  { angle: 45,  path: DIAGONAL_PETAL },
  { angle: 90,  path: CARDINAL_PETAL },
  { angle: 135, path: DIAGONAL_PETAL },
  { angle: 180, path: CARDINAL_PETAL },
  { angle: 225, path: DIAGONAL_PETAL },
  { angle: 270, path: CARDINAL_PETAL },
  { angle: 315, path: DIAGONAL_PETAL },
];

export function AshMark({ size = 24, state = 'idle', className }: Props) {
  const reduced = useReducedMotion();

  // Single transform string animates rotation (the sway) and scale (the
  // pulse) on one element — keeps the work on the GPU, no layout reads.
  // useReducedMotion users get a static mark.
  const swayDuration = state === 'thinking' ? 3 : 6;
  const pulseAnim =
    state === 'thinking'
      ? { scale: [1, 1.06, 1] }
      : { scale: 1 };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
        // willChange hints the compositor to keep this layer hot.
        willChange: reduced ? undefined : 'transform',
      }}
      aria-hidden="true"
    >
      <motion.span
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          transformOrigin: '50% 50%',
        }}
        animate={
          reduced
            ? { rotate: 0, scale: 1 }
            : {
                rotate: [0, 3, 0, -3, 0],
                ...pulseAnim,
              }
        }
        transition={
          reduced
            ? INSTANT
            : {
                rotate: {
                  duration: swayDuration,
                  ease: 'easeInOut',
                  repeat: Infinity,
                },
                scale:
                  state === 'thinking'
                    ? { duration: 1.5, ease: 'easeInOut', repeat: Infinity }
                    : INSTANT,
              }
        }
      >
        <svg
          viewBox="-12 -12 24 24"
          width={size}
          height={size}
          style={{ overflow: 'visible' }}
          fill="var(--color-accent)"
        >
          {PETALS.map((p, i) => (
            <path
              key={i}
              d={p.path}
              transform={`rotate(${p.angle})`}
            />
          ))}
        </svg>
      </motion.span>
    </span>
  );
}
