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
            // Wave C: warm-dark library-shelf card matching /cases case
            // grid + /dashboard recent reps + cohort leaderboard.
            className="block transition-opacity hover:opacity-90"
            style={{
              width: 240,
              height: 300,
              background: '#1a1817',
              color: '#faf9f5',
              padding: 18,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                className="font-mono uppercase mb-3"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: 'rgba(250,249,245,0.55)',
                }}
              >
                {(c.source ?? 'Unknown').toUpperCase()}
              </div>
              <h3
                className="font-headline italic"
                style={{
                  color: '#faf9f5',
                  fontSize: 22,
                  lineHeight: 1.05,
                  letterSpacing: '-0.015em',
                }}
              >
                {c.title}
              </h3>
            </div>
            <div
              className="font-mono uppercase flex items-center gap-2"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'rgba(250,249,245,0.55)',
              }}
            >
              {c.case_type.replace('_', ' ')} · <DifficultyDots d={c.difficulty} />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
