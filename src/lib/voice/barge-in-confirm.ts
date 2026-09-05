// barge-in-confirm.ts — pure state machine deciding whether a detected barge-in is
// real enough to actually act on (stop the interviewer's audio), separate from and
// stricter than the normal turn-detector.ts onSpeechRealStart gate.
//
// Why this exists: turn-detector.ts's MIN_SPEECH_MS (600ms) + confidence threshold
// already filter out most noise, but a real 2026 research finding on production voice
// stacks (independently confirmed by LiveKit/Pipecat's own open issues and a cited
// academic figure putting ~89% of naively-detected interruptions as FALSE) is that a
// single confidence gate is not enough for barge-in specifically — a backchannel
// ("mm-hmm"), a stray noise blip, or a brief echo artifact can clear MIN_SPEECH_MS
// without being an actual attempt to interrupt. Barge-in is uniquely costly to get
// wrong (it stops the AI's real audio), so it earns a second, stricter gate that
// normal turn-taking does not need: a short SUSTAINED window of confident speech
// frames, not just a single onSpeechRealStart event.
//
// Pure + timestamp-injected (no Date.now() inside), same convention as
// rambling-tracker.ts, so this is unit-testable with synthetic frame sequences.

// How long confident speech must hold, unbroken, before a barge-in actually fires.
// Deliberately short (this still has to feel instant to a real interruption) but
// long enough that a single noise/echo/backchannel frame or two can't trip it —
// first value to retune once there's real barge-in usage data, same treatment as
// every other threshold in this module.
export const BARGE_IN_CONFIRM_MS = 350;

export type BargeInConfirmState = {
  /** Timestamp the current unbroken confident-speech streak started, or null if
   *  not currently in one. */
  confidentSinceMs: number | null;
};

export const initialBargeInConfirmState: BargeInConfirmState = { confidentSinceMs: null };

/**
 * Call on every amplitude frame while a barge-in confirmation is pending (i.e.
 * between onSpeechRealStart firing during interviewer_speaking and the barge-in
 * either confirming or the segment ending). Any single non-confident frame resets
 * the streak — this is deliberately strict, not averaged, so a genuine dip (the
 * "mm-hmm" trailing off, an echo artifact clearing) can't smuggle through on a lucky
 * run of frames either side of it.
 */
export function onAmplitudeFrame(
  state: BargeInConfirmState,
  isConfident: boolean,
  nowMs: number
): BargeInConfirmState {
  if (!isConfident) return initialBargeInConfirmState;
  if (state.confidentSinceMs !== null) return state;
  return { confidentSinceMs: nowMs };
}

/** True once the current unbroken confident-speech streak has held long enough to
 *  treat this as a real barge-in rather than noise/echo/backchannel. */
export function isConfirmed(
  state: BargeInConfirmState,
  nowMs: number,
  thresholdMs: number = BARGE_IN_CONFIRM_MS
): boolean {
  if (state.confidentSinceMs === null) return false;
  return nowMs - state.confidentSinceMs >= thresholdMs;
}
