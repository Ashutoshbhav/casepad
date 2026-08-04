// continuation-buffer.ts — pure state machine for holding a transcribed
// utterance that the semantic endpoint check (endpoint-check-client.ts)
// flagged as sounding unfinished, so the NEXT utterance can be stitched onto
// it instead of the candidate's answer getting cut and sent early.
//
// Groq Whisper is batch-only (see turn-detector.ts's header comment) — there
// is no partial transcript while the candidate is still talking, only a full
// transcript once a VAD segment already closed. So this operates at
// whole-segment granularity, deciding AFTER a segment ends whether to send it
// or hold it for the next one, rather than true streaming-ASR endpointing
// (deciding not to close the segment at all). Closest honest approximation
// available on this stack.
//
// Pure + no timers inside (the caller owns the grace-timeout that force-sends
// a stuck buffer) — same convention as rambling-tracker.ts.

// Fail-open cap: after this many consecutive "sounds unfinished" verdicts on
// the same buffered answer, stop asking and just send it. Never defer a
// candidate's answer forever on a classifier that keeps saying "not yet."
export const MAX_CONTINUATIONS = 2;

export type ContinuationState = {
  text: string | null;
  count: number;
  lowConfidence: boolean;
};

export const initialContinuationState: ContinuationState = {
  text: null,
  count: 0,
  lowConfidence: false,
};

/** Joins any already-buffered text with a newly transcribed fragment. */
export function combine(state: ContinuationState, newText: string): string {
  const trimmed = newText.trim();
  return state.text ? `${state.text} ${trimmed}`.trim() : trimmed;
}

/** Records that `combinedText` was judged unfinished — hold it for the next utterance. */
export function defer(
  state: ContinuationState,
  combinedText: string,
  lowConfidence: boolean
): ContinuationState {
  return {
    text: combinedText,
    count: state.count + 1,
    lowConfidence: state.lowConfidence || lowConfidence,
  };
}

/** True once further deferring should be refused regardless of what the classifier says. */
export function atCap(state: ContinuationState): boolean {
  return state.count >= MAX_CONTINUATIONS;
}
