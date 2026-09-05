import { describe, it, expect } from 'vitest';
import {
  initialBargeInConfirmState,
  onAmplitudeFrame,
  isConfirmed,
  BARGE_IN_CONFIRM_MS,
} from '@/lib/voice/barge-in-confirm';

describe('barge-in-confirm', () => {
  it('is not confirmed with no confident frames yet', () => {
    expect(isConfirmed(initialBargeInConfirmState, 1_000_000)).toBe(false);
  });

  it('is not confirmed before the threshold elapses', () => {
    const s = onAmplitudeFrame(initialBargeInConfirmState, true, 0);
    expect(isConfirmed(s, BARGE_IN_CONFIRM_MS - 1)).toBe(false);
  });

  it('confirms exactly at the threshold', () => {
    const s = onAmplitudeFrame(initialBargeInConfirmState, true, 0);
    expect(isConfirmed(s, BARGE_IN_CONFIRM_MS)).toBe(true);
  });

  it('confirms well past the threshold', () => {
    const s = onAmplitudeFrame(initialBargeInConfirmState, true, 0);
    expect(isConfirmed(s, BARGE_IN_CONFIRM_MS + 5000)).toBe(true);
  });

  it('a single non-confident frame resets an in-progress streak', () => {
    let s = onAmplitudeFrame(initialBargeInConfirmState, true, 0);
    s = onAmplitudeFrame(s, false, 100); // e.g. a backchannel trailing off
    s = onAmplitudeFrame(s, true, 120);
    // Streak restarted at 120, not 0 — must wait the full window again from here.
    expect(isConfirmed(s, 120 + BARGE_IN_CONFIRM_MS - 1)).toBe(false);
    expect(isConfirmed(s, 120 + BARGE_IN_CONFIRM_MS)).toBe(true);
  });

  it('onAmplitudeFrame is idempotent once a streak is already tracked', () => {
    let s = onAmplitudeFrame(initialBargeInConfirmState, true, 1000);
    s = onAmplitudeFrame(s, true, 1200); // should NOT reset the start time to 1200
    expect(isConfirmed(s, 1000 + BARGE_IN_CONFIRM_MS)).toBe(true);
  });

  it('supports a custom threshold override', () => {
    const s = onAmplitudeFrame(initialBargeInConfirmState, true, 0);
    expect(isConfirmed(s, 200, 500)).toBe(false);
    expect(isConfirmed(s, 500, 500)).toBe(true);
  });
});
