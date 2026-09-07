import { describe, it, expect } from 'vitest';
import {
  clockState,
  turnPressure,
  DEFAULT_LIMIT_MIN,
  TURN_WAITING_MS,
  TURN_PUSHING_MS,
} from '@/lib/interview/clock';

const T0 = 1_000_000;

describe('clockState', () => {
  it('counts down from the limit and labels MM:SS', () => {
    const s = clockState(T0, T0, DEFAULT_LIMIT_MIN);
    expect(s.label).toBe('25:00');
    expect(s.phase).toBe('normal');
    expect(s.fraction).toBe(0);
  });

  it('phase goes normal -> warning (<=5m) -> critical (<=1m) -> expired', () => {
    expect(clockState(T0, T0 + 19 * 60_000).phase).toBe('normal');
    expect(clockState(T0, T0 + 21 * 60_000).phase).toBe('warning');
    expect(clockState(T0, T0 + 24 * 60_000 + 30_000).phase).toBe('critical');
    expect(clockState(T0, T0 + 25 * 60_000).phase).toBe('expired');
    expect(clockState(T0, T0 + 40 * 60_000).phase).toBe('expired');
  });

  it('clamps label and remaining at zero past the limit', () => {
    const s = clockState(T0, T0 + 99 * 60_000);
    expect(s.label).toBe('00:00');
    expect(s.remainingMs).toBe(0);
    expect(s.fraction).toBe(1);
  });

  it('respects a custom limit', () => {
    expect(clockState(T0, T0, 10).label).toBe('10:00');
    expect(clockState(T0, T0 + 10 * 60_000, 10).phase).toBe('expired');
  });

  it('tolerates a future start / clock skew (elapsed floored at 0)', () => {
    const s = clockState(T0 + 5000, T0);
    expect(s.elapsedMs).toBe(0);
    expect(s.label).toBe('25:00');
  });
});

describe('turnPressure', () => {
  it('is none before the waiting threshold, then escalates', () => {
    expect(turnPressure(T0, T0)).toBe('none');
    expect(turnPressure(T0, T0 + TURN_WAITING_MS - 1)).toBe('none');
    expect(turnPressure(T0, T0 + TURN_WAITING_MS)).toBe('waiting');
    expect(turnPressure(T0, T0 + TURN_PUSHING_MS)).toBe('pushing');
  });

  it('is none when no turn is in progress', () => {
    expect(turnPressure(null, T0 + 999_999)).toBe('none');
  });
});
