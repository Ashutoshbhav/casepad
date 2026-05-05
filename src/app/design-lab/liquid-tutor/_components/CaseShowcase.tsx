'use client';

import { motion, useReducedMotion } from 'motion/react';
import { BreathingOrb } from '../../_components/BreathingOrb';
import { SAMPLE_CASES, type TreatmentTokens } from '../../_lib/tokens';

export function CaseShowcase({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();

  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontStyle: 'italic',
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 400,
          color: tokens.textPrimary,
          margin: '0 0 14px',
          maxWidth: 720,
          letterSpacing: '-0.01em',
        }}
      >
        Pick a case. I&apos;ll meet you there.
      </h2>
      <p
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '15px',
          color: tokens.textSecondary,
          margin: '0 0 56px',
          maxWidth: 600,
        }}
      >
        Real cases from real schools. No filler, no warmups.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {SAMPLE_CASES.map((c, i) => (
          <motion.article
            key={c.title}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
            style={{
              background: tokens.elevated,
              border: `1px solid ${tokens.border}`,
              padding: '28px 24px 22px',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 240,
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
              {c.school} &middot; {c.year} &middot; {c.type}
            </div>
            <h3
              style={{
                fontFamily: tokens.fontDisplay,
                fontStyle: 'italic',
                fontSize: '24px',
                lineHeight: 1.2,
                fontWeight: 400,
                color: tokens.textPrimary,
                margin: '0 0 14px',
              }}
            >
              {c.title}
            </h3>
            <p
              style={{
                fontFamily: tokens.fontBody,
                fontSize: '14px',
                lineHeight: 1.55,
                color: tokens.textSecondary,
                margin: 0,
                flex: 1,
              }}
            >
              {c.blurb}
            </p>
            <div
              style={{
                marginTop: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: tokens.fontBody,
                fontSize: '13px',
                color: tokens.accent,
              }}
            >
              <BreathingOrb
                size={16}
                color={tokens.accent}
                glow={tokens.accentGlow ?? 'rgba(232,201,160,0.3)'}
              />
              <span>Open with Ash &rarr;</span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
