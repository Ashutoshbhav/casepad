'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { TreatmentTokens } from '../../_lib/tokens';

// Crash-down letter stagger: each of 7 letters of CASEPAD drops from
// translateY(-120%) to 0 with stagger 40ms, spring(stiffness 220, damping 14).

const WORD = 'CASEPAD';

export function HeroSection({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();

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
        // Subtle paper-noise texture via SVG fragment.
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.14 0 0 0 0 0.09 0 0 0 0.06 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
        backgroundRepeat: 'repeat',
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
        Treatment 03 &mdash; Casebook Manuscript
      </div>

      <h1
        aria-label={WORD}
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(72px, 12vw, 144px)',
          fontWeight: 700,
          color: tokens.textPrimary,
          margin: 0,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontVariationSettings: '"opsz" 144',
          display: 'flex',
          gap: '0.01em',
          overflow: 'hidden',
          padding: '0.1em 0',
        }}
      >
        {WORD.split('').map((ch, i) => (
          <motion.span
            key={i}
            initial={reduced ? { y: 0 } : { y: '-120%' }}
            animate={{ y: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 220,
                    damping: 14,
                    delay: i * 0.04,
                  }
            }
            style={{ display: 'inline-block' }}
          >
            {ch}
          </motion.span>
        ))}
      </h1>

      <motion.p
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{
          fontFamily: tokens.fontBody,
          fontStyle: 'italic',
          fontSize: '20px',
          lineHeight: 1.5,
          color: tokens.textSecondary,
          marginTop: 28,
          maxWidth: 540,
        }}
      >
        The casebook, rebound for the people who actually have to argue it.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2, delay: 1.2 }}
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
        &darr; turn the page
      </motion.div>
    </section>
  );
}
