'use client';

import { motion, useReducedMotion } from 'motion/react';
import { INSTANT } from '@/lib/motion-tokens';

// Ash as a presence — never a face. One shape that breathes.
// THE identity moment of CasePad: a coral SVG circle that breathes
// (scales 1.0 -> 1.04 over 4s sine-eased loop) wherever Ash's voice
// shows up — chat panel avatars, solve header, signin hero.
//
// Promoted from src/app/design-lab/_components/BreathingOrb.tsx so design-lab
// and production share one source of truth.
//
// States:
//  - idle: gentle 4s sine-eased breath between scale 1.0 and 1.04
//  - thinking: scale 1.12 with a subtle blur wobble
//  - listening: contracts to 0.6, frozen
//
// Halo: a second circle behind at 1.5x size, accent-glow, blurred.
//
// A11y: respects useReducedMotion() — animations collapse to static.

export type OrbState = 'idle' | 'thinking' | 'listening';

type Props = {
  size?: number;
  /** CSS color (hex / rgb / var) for the orb body. */
  color: string;
  /** CSS color for the surrounding halo glow (usually rgba with alpha). */
  glow: string;
  state?: OrbState;
};

export function BreathingOrb({
  size = 64,
  color,
  glow,
  state = 'idle',
}: Props) {
  const reduced = useReducedMotion();

  // Reduced-motion: NO infinite-repeat loops. Just static positions —
  // otherwise motion still schedules wake-ups for an invisible loop.
  const orbAnim = reduced
    ? { scale: 1, filter: 'blur(0px)' }
    : state === 'thinking'
      ? { scale: [1.1, 1.14, 1.1], filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'] }
      : state === 'listening'
        ? { scale: 0.6, filter: 'blur(0px)' }
        : { scale: [1, 1.04, 1], filter: 'blur(0px)' };

  const orbTransition = reduced
    ? INSTANT
    : state === 'thinking'
      ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const }
      : state === 'listening'
        ? { duration: 0.4, ease: 'easeOut' as const }
        : { duration: 4, repeat: Infinity, ease: 'easeInOut' as const };

  const haloAnim = reduced
    ? { scale: 1.5, opacity: 0.3 }
    : state === 'listening'
      ? { scale: 1.0, opacity: 0.15 }
      : { scale: [1.5, 1.6, 1.5], opacity: [0.25, 0.4, 0.25] };

  return (
    <div
      style={{
        position: 'relative',
        width: size * 1.8,
        height: size * 1.8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <motion.div
        animate={haloAnim}
        transition={orbTransition}
        style={{
          position: 'absolute',
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: '50%',
          background: glow,
          filter: 'blur(18px)',
        }}
      />
      <motion.div
        animate={orbAnim}
        transition={orbTransition}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}aa 55%, ${color}55 100%)`,
          boxShadow: `inset -4px -6px 12px rgba(0,0,0,0.25), 0 0 30px ${glow}`,
        }}
      />
    </div>
  );
}
