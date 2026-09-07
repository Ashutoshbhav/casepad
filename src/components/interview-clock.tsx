'use client';

// src/components/interview-clock.tsx
//
// Text-mode interview timer (PRD v3.1 text-realism). Ticks once a second off a
// fixed start time. At 0:00 it fires onExpire ONCE — the parent decides what
// that means (we soft-lock the composer and push the submit CTA; we do not
// silently submit). Colour is never the only signal: the MM:SS text and an
// aria-live phase announcement carry it for screen readers / colour-blind users.

import { useEffect, useRef, useState } from 'react';
import { clockState, DEFAULT_LIMIT_MIN, type ClockPhase } from '@/lib/interview/clock';

const PHASE_COLOR: Record<ClockPhase, string> = {
  normal: 'var(--color-text-muted)',
  warning: 'var(--color-signal-warning, #b7791f)',
  critical: 'var(--color-signal-danger, #c0392b)',
  expired: 'var(--color-signal-danger, #c0392b)',
};

const PHASE_NOTE: Record<ClockPhase, string> = {
  normal: '',
  warning: 'Five minutes left.',
  critical: 'Under a minute — start wrapping up.',
  expired: "Time's up. Give your recommendation and submit.",
};

export function InterviewClock({
  startedAt,
  limitMin = DEFAULT_LIMIT_MIN,
  onExpire,
  paused = false,
}: {
  startedAt: string | number;
  limitMin?: number;
  onExpire?: () => void;
  /** e.g. session already ended — freeze the display, don't fire onExpire. */
  paused?: boolean;
}) {
  const startedMs =
    typeof startedAt === 'number' ? startedAt : new Date(startedAt).getTime();
  const valid = Number.isFinite(startedMs);

  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const lastPhaseRef = useRef<ClockPhase | null>(null);

  useEffect(() => {
    if (!valid || paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [valid, paused]);

  if (!valid) return null;

  const s = clockState(startedMs, paused ? startedMs + limitMin * 60_000 - 1 : now, limitMin);

  if (!paused && s.phase === 'expired' && !firedRef.current) {
    firedRef.current = true;
    // defer so we don't setState-in-render a parent
    queueMicrotask(() => onExpire?.());
  }

  const phaseChanged = lastPhaseRef.current !== s.phase;
  lastPhaseRef.current = s.phase;

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${s.label}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          color: PHASE_COLOR[s.phase],
          fontWeight: s.phase === 'normal' ? 400 : 600,
        }}
      >
        {s.label}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 3,
          background: 'var(--color-bg-sunken)',
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${Math.round(s.fraction * 100)}%`,
            height: '100%',
            background: PHASE_COLOR[s.phase],
          }}
        />
      </span>
      {/* SR-only escalation; polite so it doesn't stomp the interviewer text */}
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {phaseChanged ? PHASE_NOTE[s.phase] : ''}
      </span>
    </div>
  );
}
