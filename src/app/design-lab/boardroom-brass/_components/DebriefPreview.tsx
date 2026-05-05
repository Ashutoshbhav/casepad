'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CountUp } from '../../_components/CountUp';
import { BrassRule } from '../../_components/BrassRule';
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
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
          marginBottom: 14,
        }}
      >
        // Debrief
      </div>
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: tokens.textPrimary,
          margin: '0 0 56px',
          maxWidth: 720,
        }}
      >
        The score you can defend.
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
          gap: 56,
          alignItems: 'flex-start',
        }}
      >
        {/* Score */}
        <div>
          <div
            style={{
              fontFamily: tokens.fontMono,
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: tokens.textSecondary,
              marginBottom: 12,
            }}
          >
            Overall score
          </div>
          <div
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: '120px',
              lineHeight: 1,
              fontWeight: 700,
              color: tokens.textPrimary,
              letterSpacing: '-0.04em',
              fontVariationSettings: '"opsz" 144',
            }}
          >
            <CountUp to={SAMPLE_DEBRIEF_SCORE} durationMs={1200} />
          </div>
          <div style={{ marginTop: 16, width: 180 }}>
            <BrassRule
              color={tokens.accent}
              height={1}
              duration={1.2}
              whileInView
            />
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: tokens.fontBody,
              fontSize: '13px',
              color: tokens.textSecondary,
              lineHeight: 1.5,
              maxWidth: 220,
            }}
          >
            Cohort median: 58. Top decile: 78. You held the structure for 14 of 18 minutes.
          </div>
        </div>

        {/* Dimensions */}
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
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color: tokens.textPrimary }}>{d.label}</span>
                <span style={{ color: tokens.accent }}>{d.value}</span>
              </div>
              <div
                style={{
                  height: 4,
                  background: tokens.border,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={reduced ? { width: `${d.value}%` } : { width: 0 }}
                  whileInView={{ width: `${d.value}%` }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 1.0,
                    delay: 0.1 + i * 0.08,
                    ease: 'easeOut',
                  }}
                  style={{
                    height: '100%',
                    background: tokens.accent,
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
