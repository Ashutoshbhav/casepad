'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Typewriter } from '../../_components/Typewriter';
import { BrassRule } from '../../_components/BrassRule';
import type { TreatmentTokens } from '../../_lib/tokens';

// Hero: brand wordmark "CASEPAD" types itself char-by-char (38ms/char), then a
// 1px brass rule slides in left-to-right beneath it (480ms ease-out).

export function HeroSection({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();

  // Wordmark is 7 chars at 38ms = ~266ms. Rule starts after wordmark finishes.
  const wordmarkDuration = 7 * 38;
  const ruleDelay = wordmarkDuration / 1000 + 0.05;

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
        Treatment 01 &mdash; Boardroom Brass
      </div>

      <h1
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(64px, 9vw, 96px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: tokens.textPrimary,
          margin: 0,
          fontVariationSettings: '"opsz" 144',
        }}
      >
        <Typewriter
          text="CASEPAD"
          speed={38}
          showCaret
          caretColor={tokens.accent}
        />
      </h1>

      <div style={{ width: 'min(360px, 70vw)', marginTop: 28 }}>
        <BrassRule
          color={tokens.accent}
          height={1}
          delay={ruleDelay}
          duration={0.48}
        />
      </div>

      <motion.p
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: ruleDelay + 0.4 }}
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '18px',
          lineHeight: 1.5,
          color: tokens.textSecondary,
          marginTop: 24,
          maxWidth: 540,
        }}
      >
        The room before the room.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2, delay: ruleDelay + 1.2 }}
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
        &darr; scroll to preview
      </motion.div>
    </section>
  );
}
