'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BreathingOrb, type OrbState } from '../../_components/BreathingOrb';
import type { TreatmentTokens } from '../../_lib/tokens';

// Hero: orb fades up from below, then begins breathing. Toggles between idle
// and thinking every 6s in the hero so the demo is alive without the user
// doing anything.

export function HeroSection({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();
  const [orbState, setOrbState] = useState<OrbState>('idle');

  useEffect(() => {
    if (reduced) return;
    let toggle = false;
    const id = setInterval(() => {
      toggle = !toggle;
      setOrbState(toggle ? 'thinking' : 'idle');
    }, 6000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
          marginBottom: 36,
        }}
      >
        Treatment 02 &mdash; Liquid Tutor
      </div>

      <motion.div
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      >
        <BreathingOrb
          size={96}
          color={tokens.accent}
          glow={tokens.accentGlow ?? 'rgba(232,201,160,0.3)'}
          state={orbState}
        />
      </motion.div>

      <motion.h1
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
        style={{
          fontFamily: tokens.fontDisplay,
          fontStyle: 'italic',
          fontSize: 'clamp(48px, 7vw, 72px)',
          fontWeight: 400,
          color: tokens.textPrimary,
          margin: '32px 0 14px',
          letterSpacing: '-0.01em',
        }}
      >
        Hi, I&apos;m Ash.
      </motion.h1>

      <motion.p
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '18px',
          lineHeight: 1.55,
          color: tokens.textSecondary,
          maxWidth: 480,
          margin: 0,
        }}
      >
        I&apos;ll work the case with you. Not at you. Soft on tone, hard on structure.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2, delay: 2.0 }}
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
        }}
      >
        &darr; she&apos;s breathing
      </motion.div>
    </section>
  );
}
