'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SAMPLE_CASES, type TreatmentTokens } from '../../_lib/tokens';

export function CaseShowcase({ tokens }: { tokens: TreatmentTokens }) {
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
        // Cases
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
        Real cases. Real schools. No filler.
      </h2>

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
            transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
            style={{
              background: tokens.elevated,
              border: `1px solid ${tokens.border}`,
              padding: '24px 22px',
              borderRadius: 4,
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
                color: tokens.accent,
                marginBottom: 14,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{c.school} &middot; {c.year}</span>
              <span style={{ color: tokens.textSecondary }}>{c.type}</span>
            </div>
            <h3
              style={{
                fontFamily: tokens.fontDisplay,
                fontSize: '22px',
                lineHeight: 1.2,
                fontWeight: 600,
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
                marginTop: 18,
                paddingTop: 14,
                borderTop: `1px solid ${tokens.border}`,
                fontFamily: tokens.fontMono,
                fontSize: '11px',
                letterSpacing: '0.08em',
                color: tokens.accent,
              }}
            >
              OPEN CASE &rarr;
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
