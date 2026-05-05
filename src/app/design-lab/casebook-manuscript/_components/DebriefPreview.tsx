'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CountUp } from '../../_components/CountUp';
import {
  SAMPLE_DEBRIEF_SCORE,
  type TreatmentTokens,
} from '../../_lib/tokens';

const DIMENSIONS = [
  { label: 'MECE', value: 72 },
  { label: 'Depth', value: 64 },
  { label: 'Quant', value: 70 },
  { label: 'Storyline', value: 62 },
];

export function DebriefPreview({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();

  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: tokens.accent,
          marginBottom: 14,
        }}
      >
        Chapter III &mdash; The Debrief
      </div>
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 700,
          color: tokens.textPrimary,
          margin: '0 0 56px',
          maxWidth: 720,
          letterSpacing: '-0.02em',
        }}
      >
        The score, with the receipts.
      </h2>

      <div
        style={{
          background: tokens.elevated,
          border: `1px solid ${tokens.border}`,
          padding: 'clamp(28px, 5vw, 56px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
          gap: 'clamp(24px, 4vw, 56px)',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: tokens.fontMono,
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: tokens.textSecondary,
              marginBottom: 16,
            }}
          >
            Overall mark
          </div>

          <motion.div
            initial={
              reduced
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 2 }
            }
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: '128px',
              lineHeight: 1,
              fontWeight: 700,
              color: tokens.textPrimary,
              letterSpacing: '-0.04em',
              fontVariationSettings: '"opsz" 144',
            }}
          >
            <CountUp to={SAMPLE_DEBRIEF_SCORE} durationMs={900} />
          </motion.div>

          <motion.div
            initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            style={{
              height: 1,
              background: tokens.accent,
              marginTop: 14,
              transformOrigin: 'left center',
              width: 200,
            }}
          />

          <p
            style={{
              fontFamily: tokens.fontBody,
              fontStyle: 'italic',
              fontSize: '14px',
              color: tokens.textSecondary,
              marginTop: 16,
              maxWidth: 240,
              lineHeight: 1.5,
            }}
          >
            Cohort median 58. Top decile 78.
          </p>
        </div>

        {/* Print-style hatched bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {DIMENSIONS.map((d, i) => (
            <div key={d.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontFamily: tokens.fontMono,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color: tokens.textPrimary }}>{d.label}</span>
                <span style={{ color: tokens.accent }}>{d.value}</span>
              </div>
              <div
                style={{
                  height: 14,
                  background: tokens.bg,
                  border: `1px solid ${tokens.border}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={
                    reduced ? { width: `${d.value}%` } : { width: 0 }
                  }
                  whileInView={{ width: `${d.value}%` }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.1 + i * 0.08,
                    ease: 'easeOut',
                  }}
                  style={{
                    height: '100%',
                    background: `repeating-linear-gradient(45deg, ${tokens.accent}, ${tokens.accent} 4px, ${tokens.accent}cc 4px, ${tokens.accent}cc 8px)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
