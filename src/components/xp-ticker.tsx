'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { totalXp, lastUserDelta } from '@/lib/xp-heuristics';

type Msg = { role: 'user' | 'interviewer'; content: string };

// In-session XP badge. Lives in the /solve header. Reads the lifted
// messages array, recomputes total XP on each new turn, flashes a small
// "+15" delta over the badge for ~1.2s when XP changes. No persistence —
// XP is derived state, recomputed on mount from initialMessages.
export function XpTicker({ messages }: { messages: readonly Msg[] }) {
  const reduced = useReducedMotion();
  const prevRef = useRef<readonly Msg[]>(messages);
  const [delta, setDelta] = useState<number>(0);
  const [deltaKey, setDeltaKey] = useState<number>(0);

  const xp = totalXp(messages);

  useEffect(() => {
    const prev = prevRef.current;
    const d = lastUserDelta(prev, messages);
    if (d > 0) {
      setDelta(d);
      setDeltaKey((k) => k + 1);
    }
    prevRef.current = messages;
  }, [messages]);

  return (
    <div
      className="relative font-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 rounded"
      style={{
        background: 'var(--color-bg-sunken, transparent)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        color: 'var(--color-text-secondary)',
        minWidth: 64,
        textAlign: 'center',
      }}
      aria-live="polite"
      aria-label={`XP ${xp}`}
    >
      <span style={{ color: 'var(--color-accent)', marginRight: 4 }}>XP</span>
      <span style={{ color: 'var(--color-text-primary)' }}>{xp}</span>
      <AnimatePresence>
        {delta > 0 && !reduced && (
          <motion.span
            key={deltaKey}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -16 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setDelta(0)}
            style={{
              position: 'absolute',
              top: 0,
              right: 6,
              color: 'var(--color-accent)',
              fontWeight: 600,
              pointerEvents: 'none',
              textShadow: '0 0 8px var(--color-accent)',
            }}
          >
            +{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
