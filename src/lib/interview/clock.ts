// src/lib/interview/clock.ts
//
// Pure helpers for the text-mode interview timer (PRD v3.1 text-realism
// mechanics). A real case interview is time-boxed; you feel the clock. The
// component (src/components/interview-clock.tsx) just ticks and renders this.
//
// Default 25 minutes. At 0:00 the room does NOT silently submit — it soft-locks
// the composer and pushes the "wrap up / submit" affordance. That's a product
// choice, not this file's: this file only reports state.

export type ClockPhase = 'normal' | 'warning' | 'critical' | 'expired';

export interface ClockState {
  remainingMs: number;
  elapsedMs: number;
  phase: ClockPhase;
  /** "MM:SS", clamped at "00:00". */
  label: string;
  /** 0..1 fraction of the limit elapsed (for a progress ring / bar). */
  fraction: number;
}

export const DEFAULT_LIMIT_MIN = 25;
const WARNING_AT_MS = 5 * 60_000; // amber with <= 5 min left
const CRITICAL_AT_MS = 60_000; // red with <= 1 min left

export function clockState(
  startedAtMs: number,
  nowMs: number,
  limitMin: number = DEFAULT_LIMIT_MIN,
): ClockState {
  const limitMs = Math.max(0, limitMin) * 60_000;
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  const remainingMs = Math.max(0, limitMs - elapsedMs);

  let phase: ClockPhase;
  if (remainingMs <= 0) phase = 'expired';
  else if (remainingMs <= CRITICAL_AT_MS) phase = 'critical';
  else if (remainingMs <= WARNING_AT_MS) phase = 'warning';
  else phase = 'normal';

  const totalSec = Math.round(remainingMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const label = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return {
    remainingMs,
    elapsedMs,
    phase,
    label,
    fraction: limitMs === 0 ? 1 : Math.min(1, elapsedMs / limitMs),
  };
}

// --- per-turn "they're waiting" pressure (the text analogue of the ~40s
// spoken-ramble interrupt). Pressure only — never auto-sends. ---

export type TurnPressure = 'none' | 'waiting' | 'pushing';

export const TURN_WAITING_MS = 45_000;
export const TURN_PUSHING_MS = 90_000;

export function turnPressure(turnStartedAtMs: number | null, nowMs: number): TurnPressure {
  if (turnStartedAtMs == null) return 'none';
  const d = nowMs - turnStartedAtMs;
  if (d >= TURN_PUSHING_MS) return 'pushing';
  if (d >= TURN_WAITING_MS) return 'waiting';
  return 'none';
}
