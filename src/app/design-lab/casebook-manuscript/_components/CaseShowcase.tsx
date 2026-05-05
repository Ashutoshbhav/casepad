'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SAMPLE_CASES, type TreatmentTokens } from '../../_lib/tokens';

// Identity moment: 3 paper cards in a slight 3D fan. Every 4s, one rotates
// to center. Hover scales 1.08 with rotateY 0 and 2.5deg Y-tilt.

export function CaseShowcase({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(1); // start with center card highlighted

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % SAMPLE_CASES.length);
    }, 4000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1100,
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
        Chapter I &mdash; The Cases
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
        Three cases on the table.
      </h2>

      <div
        style={{
          perspective: '1200px',
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          padding: '40px 0',
          flexWrap: 'wrap',
        }}
      >
        {SAMPLE_CASES.map((c, i) => {
          const baseRotate = (i - 1) * 3; // -3, 0, 3
          const isActive = i === active;
          const rotate = isActive ? 0 : baseRotate;
          const scale = isActive ? 1.04 : 1;

          return (
            <motion.article
              key={c.title}
              animate={
                reduced
                  ? { rotateY: 0, scale: 1 }
                  : { rotateY: rotate, scale }
              }
              whileHover={
                reduced
                  ? {}
                  : { rotateY: 0, scale: 1.08, rotateX: -2.5, y: -6 }
              }
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              style={{
                background: tokens.elevated,
                border: `1px solid ${tokens.border}`,
                padding: '28px 24px 22px',
                borderRadius: 2,
                width: 280,
                minHeight: 320,
                display: 'flex',
                flexDirection: 'column',
                transformStyle: 'preserve-3d',
                boxShadow:
                  '0 1px 0 rgba(0,0,0,0.05), 0 8px 24px rgba(64, 50, 28, 0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                position: 'relative',
              }}
            >
              {/* School publisher stamp */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  fontFamily: tokens.fontMono,
                  fontSize: '10px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: tokens.accent,
                  padding: '4px 8px',
                  border: `1px solid ${tokens.accent}55`,
                  borderRadius: 2,
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(122, 46, 46, 0.08)',
                  background: `${tokens.accent}0a`,
                }}
              >
                {c.school} &middot; {c.year}
              </div>

              <div
                style={{
                  fontFamily: tokens.fontMono,
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  color: tokens.textSecondary,
                  marginTop: 36,
                  marginBottom: 14,
                }}
              >
                {c.type}
              </div>
              <h3
                style={{
                  fontFamily: tokens.fontDisplay,
                  fontSize: '24px',
                  lineHeight: 1.15,
                  fontWeight: 700,
                  color: tokens.textPrimary,
                  margin: '0 0 14px',
                  letterSpacing: '-0.01em',
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontFamily: tokens.fontBody,
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: tokens.textPrimary,
                  margin: 0,
                  flex: 1,
                }}
              >
                {c.blurb}
              </p>
              <button
                type="button"
                style={{
                  marginTop: 22,
                  alignSelf: 'flex-start',
                  background: tokens.accent,
                  color: tokens.accentInk,
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: 2,
                  fontFamily: tokens.fontBody,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                }}
              >
                Begin
              </button>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
