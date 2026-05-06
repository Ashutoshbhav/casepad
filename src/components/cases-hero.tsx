'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { AshMark } from './ash-mark';
import { SPRING, EASE, DURATION, INSTANT } from '@/lib/motion-tokens';

// Cases featured-hero card. Entrance choreography — staggered transform
// + opacity, all spring, no width/height, no layout shift:
//
//   eyebrow:  delay 0.05s, fade
//   title:    delay 0.10s, slide-up 8px
//   excerpt:  delay 0.20s, fade
//   CTA row:  delay 0.30s, slide-up 6px
//
// Asterisk to the LEFT of the Begin label inherits the brand lockup
// pattern from the nav.
export function CasesHero({
  caseId,
  source,
  title,
  excerpt,
  caseTypeLabel,
  difficulty,
}: {
  caseId: string;
  source: string;
  title: string;
  excerpt: string;
  caseTypeLabel: string;
  difficulty: string;
}) {
  const reduced = useReducedMotion();
  const fill = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const [is3DEligible, setIs3DEligible] = useState(false);

  // 'cases' preset is registered at page level via <AsteriskSceneRegister />
  // in src/app/cases/page.tsx — no need to re-register here.

  // Eligibility mirror — for the 2D fallback only. Eligible clients let
  // the persistent canvas handle the visual; this row simply leaves blank
  // space where the in-flow 3D mount used to sit.
  // Width gate removed 2026-05-04 — mobile now gets the tuned 3D scene.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduced) return;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) setIs3DEligible(true);
    } catch {
      // WebGL2 unsupported — stay on 2D fallback.
    }
  }, [reduced]);

  return (
    <div
      className="rounded-lg py-8 sm:py-12"
      style={{ background: 'transparent' }}
    >
      {/* Editorial top-area: 3D AshMark + featured eyebrow lockup. The 3D
          canvas is gated behind the same eligibility check as /signin. The
          chunk is already cached after the user signs in, so the 3D mark
          appears with no loading state on subsequent visits. */}
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reduced
            ? INSTANT
            : { duration: DURATION.smooth, delay: 0.05, ease: EASE.expo }
        }
        className="flex items-center gap-3 mb-4"
      >
        {/* On 3D-eligible clients the persistent canvas paints the asterisk
            in this region of the viewport; we leave a 56px placeholder so
            the eyebrow text aligns. Ineligible clients get the 2D mark. */}
        {is3DEligible ? (
          <span style={{ display: 'inline-block', width: 56, height: 56 }} aria-hidden="true" />
        ) : (
          <AshMark size={56} />
        )}
        <span
          className="font-mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-accent)' }}
        >
          {source.toUpperCase()} · FEATURED
        </span>
      </motion.div>
      <motion.h2
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced ? INSTANT : { ...SPRING.smooth, delay: 0.10 }
        }
        className="font-headline italic"
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'clamp(40px, 7vw, 88px)',
          lineHeight: 1.0,
          letterSpacing: '-0.025em',
          maxWidth: '16ch',
        }}
      >
        {title}
      </motion.h2>
      {excerpt && (
        <motion.p
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduced
              ? INSTANT
              : { duration: DURATION.smooth, delay: 0.20, ease: EASE.expo }
          }
          className="font-headline italic mt-4 text-base leading-relaxed max-w-3xl"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {excerpt}
        </motion.p>
      )}
      <motion.div
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced ? INSTANT : { ...SPRING.smooth, delay: 0.30 }
        }
        className="mt-6 flex items-center gap-4"
      >
        <Link
          href={`/solve/${caseId}`}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hero-cta"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)',
          }}
        >
          <span className="-ml-1 inline-flex items-center" aria-hidden="true">
            <AshMark size={16} />
          </span>
          <span>Begin</span>
        </Link>
        <span className="meta-label flex items-center gap-2">
          {caseTypeLabel} ·{' '}
          <span aria-label={`Difficulty: ${difficulty}`} className="inline-flex items-center gap-[3px] align-middle">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: i < fill ? 'var(--color-accent)' : 'transparent',
                  border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
                }}
              />
            ))}
          </span>
        </span>
      </motion.div>
    </div>
  );
}
