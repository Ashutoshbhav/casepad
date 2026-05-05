'use client';

import { useEffect, useState } from 'react';

// Types out a string at ~30 chars/sec with a brass blinking caret.
// Skips animation entirely when the user prefers reduced motion.
const CHARS_PER_SECOND = 30;
const MS_PER_CHAR = 1000 / CHARS_PER_SECOND;

export function TypewriterMessage({ text }: { text: string }) {
  const [reduced, setReduced] = useState(false);
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

  // Read prefers-reduced-motion once on mount. We don't subscribe to
  // changes — toggling the OS setting mid-animation is rare enough to
  // not be worth the listener.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setShown(text);
      setDone(true);
      return;
    }
    setShown('');
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, MS_PER_CHAR);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return (
    <span>
      {shown}
      {!done && <span className="brass-caret" aria-hidden="true" />}
    </span>
  );
}
