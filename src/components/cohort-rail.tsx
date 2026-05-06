'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { SPRING, INSTANT } from '@/lib/motion-tokens';

// Cohort Five rail — each card animates in with stagger 80ms on view (lifted
// from the design-lab CaseShowcase whileInView pattern, 5-card variant).
export type CohortCard = {
  id: string;
  title: string;
  source: string | null;
  case_type: string;
  difficulty: string;
};

function DifficultyDots({ d }: { d: string }) {
  const fill = d === 'easy' ? 1 : d === 'medium' ? 2 : 3;
  return (
    <span aria-label={`Difficulty: ${d}`} className="inline-flex items-center gap-[3px] align-middle">
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
  );
}

export function CohortRail({ cards }: { cards: CohortCard[] }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {cards.map((c, i) => (
        <motion.div
          key={c.id}
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={
            reduced ? INSTANT : { ...SPRING.smooth, delay: i * 0.06 }
          }
          style={{ scrollSnapAlign: 'start', willChange: 'transform, opacity' }}
          className="flex-shrink-0"
        >
          <Link
            href={`/solve/${c.id}`}
            className="block w-[280px] rounded-lg p-5 transition-colors"
            style={{
              background: 'var(--color-bg-elevated)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="meta-label mb-2">
              {c.source ?? 'Unknown'}
            </div>
            <h3
              className="font-headline text-lg leading-snug line-clamp-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {c.title}
            </h3>
            <div className="meta-label mt-3 flex items-center gap-2">
              {c.case_type.replace('_', ' ')} · <DifficultyDots d={c.difficulty} />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
