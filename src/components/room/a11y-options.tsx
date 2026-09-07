'use client';

// src/components/room/a11y-options.tsx
//
// Accessibility opt-ins for the interview room (PRD v3.1 WCAG 2.2 sweep):
//   - extended time      → the 25-min clock runs at 1.75x for anyone who
//                          needs it (matches a standard exam accommodation)
//   - assistive transcript → drops the scroll-away fade so the whole
//                          transcript stays readable (for screen-reader /
//                          low-vision users the fade is pure obstruction)
//
// Both are per-viewer localStorage flags. Wrapped in try/catch — a private
// window or blocked storage must not break the room.

import { useEffect, useState } from 'react';

const K_TIME = 'casepad:extended-time';
const K_TRANSCRIPT = 'casepad:assistive-transcript';
export const EXTENDED_TIME_MULTIPLIER = 1.75;

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function write(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — the toggle just won't persist */
  }
}

/** Hook: read a flag once on mount (SSR-safe: false until hydrated). */
export function useA11yFlag(which: 'time' | 'transcript'): boolean {
  const key = which === 'time' ? K_TIME : K_TRANSCRIPT;
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(read(key));
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setOn(read(key));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
  return on;
}

export function A11yOptions() {
  const [time, setTime] = useState(false);
  const [transcript, setTranscript] = useState(false);
  useEffect(() => {
    setTime(read(K_TIME));
    setTranscript(read(K_TRANSCRIPT));
  }, []);

  const toggle = (which: 'time' | 'transcript', next: boolean) => {
    if (which === 'time') {
      setTime(next);
      write(K_TIME, next);
    } else {
      setTranscript(next);
      write(K_TRANSCRIPT, next);
    }
    // Nudge same-tab listeners (the `storage` event only fires cross-tab).
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: which === 'time' ? K_TIME : K_TRANSCRIPT }));
    } catch {
      /* Safari <=15 can't construct StorageEvent — the components read on
         next mount anyway; not worth a polyfill */
    }
  };

  const label: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontFamily: 'var(--font-room-mono, ui-monospace, monospace)',
    fontSize: 12,
    lineHeight: 1.5,
    color: 'rgb(50,50,52)',
    padding: '6px 0',
    cursor: 'pointer',
  };

  return (
    <details style={{ padding: '8px 20px', borderBottom: '1px solid rgba(0,0,0,0.16)' }}>
      <summary
        style={{
          fontFamily: 'var(--font-room-mono, ui-monospace, monospace)',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(50,50,52,0.62)',
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        Accessibility options
      </summary>
      <div style={{ marginTop: 6 }}>
        <label style={label}>
          <input
            type="checkbox"
            checked={time}
            onChange={(e) => toggle('time', e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#c23f00' }}
          />
          <span>
            Extended time — run the interview clock at {EXTENDED_TIME_MULTIPLIER}&times; (about{' '}
            {Math.round(25 * EXTENDED_TIME_MULTIPLIER)} min instead of 25).
          </span>
        </label>
        <label style={label}>
          <input
            type="checkbox"
            checked={transcript}
            onChange={(e) => toggle('transcript', e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#c23f00' }}
          />
          <span>Assistive transcript — keep the whole transcript visible (turn off the scroll-away fade).</span>
        </label>
      </div>
    </details>
  );
}
