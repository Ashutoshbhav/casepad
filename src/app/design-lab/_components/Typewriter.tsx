'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

// Generic char-by-char typewriter for marketing-style usage in the Design Lab
// treatments. Distinct from the existing solve-page typewriter; this one
// reveals on-mount or on-view without depending on streaming state.

type Props = {
  text: string;
  /** ms per character. */
  speed?: number;
  /** ms before the first char appears. */
  startDelay?: number;
  /** Only start typing once the element scrolls into view. */
  startOnView?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Show a blinking caret while typing. */
  showCaret?: boolean;
  caretColor?: string;
};

export function Typewriter({
  text,
  speed = 38,
  startDelay = 0,
  startOnView = false,
  className,
  style,
  showCaret = false,
  caretColor = 'currentColor',
}: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text : '');
  const [done, setDone] = useState(reduced);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      setShown(text);
      setDone(true);
      return;
    }

    function start() {
      if (startedRef.current) return;
      startedRef.current = true;
      let i = 0;
      const startAt = performance.now() + startDelay;
      const tick = (now: number) => {
        if (now < startAt) {
          requestAnimationFrame(tick);
          return;
        }
        const elapsed = now - startAt;
        const target = Math.min(text.length, Math.floor(elapsed / speed));
        if (target !== i) {
          i = target;
          setShown(text.slice(0, i));
        }
        if (i < text.length) {
          requestAnimationFrame(tick);
        } else {
          setDone(true);
        }
      };
      requestAnimationFrame(tick);
    }

    if (!startOnView) {
      start();
      return;
    }

    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            obs.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [text, speed, startDelay, startOnView, reduced]);

  return (
    <span ref={ref} className={className} style={style}>
      {shown}
      {showCaret && !done && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: '0.5ch',
            background: caretColor,
            color: caretColor,
            marginLeft: '1px',
            animation: 'cp-caret-blink 1s steps(2, start) infinite',
          }}
        >
          |
        </span>
      )}
      <style jsx>{`
        @keyframes cp-caret-blink {
          to {
            visibility: hidden;
          }
        }
      `}</style>
    </span>
  );
}
