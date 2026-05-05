'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BreathingOrb } from '../../_components/BreathingOrb';
import { CountUp } from '../../_components/CountUp';
import {
  SAMPLE_DEBRIEF_SCORE,
  type TreatmentTokens,
} from '../../_lib/tokens';

// Debrief: orb scales up to 200% then reveals "67" inside. We approximate by
// rendering the orb behind, then fading the score number on top once revealed.

export function DebriefPreview({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(() => setRevealed(true), 600);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    const node = document.getElementById('lt-debrief-anchor');
    if (node) obs.observe(node);
    return () => obs.disconnect();
  }, [reduced]);

  return (
    <section
      id="lt-debrief-anchor"
      style={{
        padding: '120px 24px',
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
          marginBottom: 28,
        }}
      >
        Your debrief
      </div>

      <div
        style={{
          position: 'relative',
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <motion.div
          animate={
            reduced
              ? { scale: 1, opacity: 0.4 }
              : revealed
                ? { scale: 2.2, opacity: 0.35 }
                : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{ position: 'absolute' }}
        >
          <BreathingOrb
            size={120}
            color={tokens.accent}
            glow={tokens.accentGlow ?? 'rgba(232,201,160,0.3)'}
          />
        </motion.div>

        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={
            revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
          }
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: tokens.fontDisplay,
            fontStyle: 'italic',
            fontSize: '160px',
            lineHeight: 1,
            fontWeight: 400,
            color: tokens.textPrimary,
            letterSpacing: '-0.04em',
          }}
        >
          {revealed && <CountUp to={SAMPLE_DEBRIEF_SCORE} durationMs={900} />}
        </motion.div>
      </div>

      <p
        style={{
          fontFamily: tokens.fontDisplay,
          fontStyle: 'italic',
          fontSize: '24px',
          color: tokens.textPrimary,
          margin: '0 0 8px',
        }}
      >
        You held the structure.
      </p>
      <p
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '15px',
          color: tokens.textSecondary,
          margin: 0,
          maxWidth: 520,
          marginInline: 'auto',
        }}
      >
        Cohort median 58. Top decile 78. Quant slipped at minute 11 &mdash;
        I&apos;ll show you where.
      </p>
    </section>
  );
}
