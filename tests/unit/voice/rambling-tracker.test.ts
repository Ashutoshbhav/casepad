import { describe, it, expect } from 'vitest';
import {
  initialRamblingState,
  onSpeechStart,
  onTurnSent,
  shouldNudge,
  NUDGE_THRESHOLD_MS,
} from '@/lib/voice/rambling-tracker';

describe('rambling-tracker', () => {
  it('does not nudge with no speaking streak yet', () => {
    expect(shouldNudge(initialRamblingState, 1_000_000)).toBe(false);
  });

  it('does not nudge before the threshold elapses', () => {
    const s = onSpeechStart(initialRamblingState, 0);
    expect(shouldNudge(s, NUDGE_THRESHOLD_MS - 1)).toBe(false);
  });

  it('nudges exactly at the threshold', () => {
    const s = onSpeechStart(initialRamblingState, 0);
    expect(shouldNudge(s, NUDGE_THRESHOLD_MS)).toBe(true);
  });

  it('nudges well past the threshold', () => {
    const s = onSpeechStart(initialRamblingState, 0);
    expect(shouldNudge(s, NUDGE_THRESHOLD_MS + 30_000)).toBe(true);
  });

  it('onSpeechStart is idempotent once a streak is already tracked', () => {
    const s1 = onSpeechStart(initialRamblingState, 1000);
    const s2 = onSpeechStart(s1, 5000); // should NOT reset the start time to 5000
    expect(shouldNudge(s2, 1000 + NUDGE_THRESHOLD_MS)).toBe(true);
  });

  it('onTurnSent resets the streak so nudging stops', () => {
    const s1 = onSpeechStart(initialRamblingState, 0);
    const s2 = onTurnSent();
    expect(shouldNudge(s2, NUDGE_THRESHOLD_MS + 1000)).toBe(false);
    expect(s2).toEqual(initialRamblingState);
  });

  it('supports a custom threshold override', () => {
    const s = onSpeechStart(initialRamblingState, 0);
    expect(shouldNudge(s, 10_000, 20_000)).toBe(false);
    expect(shouldNudge(s, 20_000, 20_000)).toBe(true);
  });
});
