// rambling-tracker.ts — pure timing state machine deciding WHEN to nudge a
// candidate who has been talking continuously for a long time, without ever
// pausing long enough for vad-web to fire onSpeechEnd on its own.
//
// This exists because real streaming-STT-based "AI interrupts mid-word" is
// out of scope (Groq Whisper is batch-only — see turn-detector.ts). Instead:
// once a single continuous speech streak crosses NUDGE_THRESHOLD_MS, the
// caller force-flushes the current segment (turn-detector's pause()+resume(),
// since submitUserSpeechOnPause is on) so the candidate's ramble-so-far gets
// sent as a turn and the interviewer can redirect at the next natural pause,
// rather than staying silent for a minute-plus.
//
// Pure + timestamp-injected (no Date.now() inside) so it's unit-testable with
// synthetic sequences, matching this repo's convention for case-state modules.

export const NUDGE_THRESHOLD_MS = 65_000;

export type RamblingTrackerState = {
  speakingSinceMs: number | null;
};

export const initialRamblingState: RamblingTrackerState = { speakingSinceMs: null };

/** Call on VAD speech-start. No-ops if already tracking a streak. */
export function onSpeechStart(state: RamblingTrackerState, nowMs: number): RamblingTrackerState {
  if (state.speakingSinceMs !== null) return state;
  return { speakingSinceMs: nowMs };
}

/** Call whenever a segment is sent as a turn (normal end OR a nudge flush) — resets the streak. */
export function onTurnSent(): RamblingTrackerState {
  return { speakingSinceMs: null };
}

/** True once the current unbroken speaking streak has crossed the nudge threshold. */
export function shouldNudge(
  state: RamblingTrackerState,
  nowMs: number,
  thresholdMs: number = NUDGE_THRESHOLD_MS
): boolean {
  if (state.speakingSinceMs === null) return false;
  return nowMs - state.speakingSinceMs >= thresholdMs;
}
