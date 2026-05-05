'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

// Generic count-up number — animates from 0 to `to` over `durationMs` once the
// element enters the viewport. Respects prefers-reduced-motion.

type Props = {
  to: number;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function CountUp({ to, durationMs = 1200, className, style }: Props) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / durationMs);
              const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
              setValue(Math.round(eased * to));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [to, durationMs, reduced]);

  return (
    <span ref={ref} className={className} style={style}>
      {value}
    </span>
  );
}
