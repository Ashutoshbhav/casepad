'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRING } from '@/lib/motion-tokens';

// SplitText — Lusion-style per-character reveal.
//
// Usage:
//   <SplitText text="the room before the room." stagger={30} delay={0} />
//
// Behaviour:
//   - Each character renders as a <motion.span> with its own delay.
//   - When `revealed` is true (default), characters animate from
//     opacity 0, y:8 → opacity 1, y:0 with the configured stagger.
//   - When `revealed` is false, characters sit at their initial state
//     (hidden). Toggling `revealed` from false → true re-fires the
//     stagger. Useful for scroll-triggered sequences.
//   - Reduced-motion: all characters render visible at once, no delays.
//   - Spaces are preserved as non-animated whitespace so multi-line copy
//     wraps naturally. Each word is grouped in an inline-block span so a
//     single char doesn't dangle on its own line at narrow widths.

// Per-character spring — uses the shared smooth token. Stiffer than the
// pure token feels twitchy on long lines; the smooth values land at the
// editorial weight the typography asks for.
const charSpring = SPRING.smooth;

export function SplitText({
  text,
  delay = 0,
  stagger = 30,
  revealed = true,
  className,
  style,
}: {
  text: string;
  delay?: number; // ms before first char
  stagger?: number; // ms between chars
  revealed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();

  // willChange-on-demand: keep compositor layers hot only WHILE the chars
  // are mid-reveal. Leaving willChange on forever bloats the GPU layer pool
  // for off-screen text and shows up as memory churn after a long scroll.
  // Computed total settle time = (n - 1) * stagger + ~600ms (smooth spring).
  const [hot, setHot] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    setHot(true);
    const settleMs = Math.max(text.length, 1) * stagger + 600;
    const t = setTimeout(() => setHot(false), settleMs);
    return () => clearTimeout(t);
  }, [revealed, stagger, text.length]);

  // Split into [word, space, word, space, ...]. Preserving the natural
  // whitespace lets the browser break lines normally.
  const tokens = useMemo(() => {
    const out: { kind: 'word' | 'space'; value: string }[] = [];
    const re = /(\s+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ kind: 'word', value: text.slice(last, m.index) });
      out.push({ kind: 'space', value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ kind: 'word', value: text.slice(last) });
    return out;
  }, [text]);

  // Pre-compute per-char index so the stagger flows through the whole
  // string, not per-word.
  const charPositions = useMemo(() => {
    const positions: number[] = [];
    let i = 0;
    for (const tok of tokens) {
      if (tok.kind === 'word') {
        for (let j = 0; j < tok.value.length; j++) positions.push(i++);
      } else {
        positions.push(-1); // space, no animation index
      }
    }
    return positions;
  }, [tokens]);

  // Reduced-motion or instant-render path — no per-char spans, lower DOM
  // weight, no animation runtime cost.
  if (reduced) {
    return (
      <span className={className} style={style} aria-label={text}>
        {text}
      </span>
    );
  }

  let charCursor = 0;
  return (
    <span
      className={className}
      style={style}
      aria-label={text}
    >
      {tokens.map((tok, ti) => {
        if (tok.kind === 'space') {
          return <span key={`s-${ti}`} aria-hidden="true">{tok.value}</span>;
        }
        return (
          <span
            key={`w-${ti}`}
            // inline-block on the WORD lets it wrap as a unit so a lone
            // letter doesn't strand mid-line during reflow.
            style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
            aria-hidden="true"
          >
            {Array.from(tok.value).map((ch) => {
              const idx = charPositions[charCursor++];
              const ms = delay + idx * stagger;
              return (
                <motion.span
                  key={`c-${ti}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ ...charSpring, delay: ms / 1000 }}
                  style={{
                    display: 'inline-block',
                    willChange: hot ? 'transform, opacity' : undefined,
                  }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
