'use client';

// turn-detector.ts — thin wrapper around @ricky0123/vad-web's MicVAD, giving
// <LiveMicInput> a small, app-shaped contract instead of the library's raw
// API. MicVAD itself does the real work (Silero speech-probability model,
// redemption/debounce timing, pre-speech padding) — this module just:
//   1. Points it at the locally-hosted model + WASM assets (public/vad/,
//      copied from node_modules by scripts/setup-vad-assets.mjs — see that
//      file for why they aren't committed to git).
//   2. Defers mic-permission request out of `new()` (startOnLoad: false) so
//      the model can load on mount without a permission prompt, and the
//      prompt only fires on the caller's explicit `enable()` — an intentional
//      user gesture, not silent-on-mount mic access.
//   3. Converts the raw 16kHz Float32Array MicVAD hands back on speech-end
//      into a WAV Blob via pcm-wav.ts, matching the same "audio Blob" shape
//      /api/voice/transcribe already accepts from the old MediaRecorder path.
//   4. Surfaces `isSpeech` per-frame (already a 0..1 probability from the
//      model) as `onAmplitude` — reused both to drive the HUD waveform and to
//      detect candidate speech during interviewer_speaking for barge-in.
//
// Never-fail: model load or getUserMedia failure both reject a Promise the
// caller is expected to catch and fall back to push-to-talk / text (see
// <LiveMicInput>'s 3-tier ladder) — this module never throws asynchronously
// after that point, and swallows non-fatal per-frame errors internally
// (MicVAD already does this — see its onaudioprocess try/catch).

import { encodeWavBlob } from './pcm-wav';

const ASSET_BASE = '/vad/';

// Tuned for interview pacing: default redemptionMs (1400ms) reads as
// laggy for back-and-forth conversation. 650ms is the floor that still
// reliably clears a normal breath/"um" pause without cutting the candidate
// off — go materially lower than this and thinking-pauses start getting
// mistaken for the end of a turn.
const REDEMPTION_MS = 650;
// Widened pause tolerance for "the candidate explicitly asked for a moment
// to think" (see src/lib/interview/thinking-time.ts + live-mic-input.tsx's
// setPatience wiring) — halting/muttering thinking-out-loud speech has
// natural pauses well past the normal 650ms conversational threshold; at
// the normal setting each pause would auto-send a fragment as a separate
// turn, interrupting exactly the thinking space the candidate asked for.
const REDEMPTION_MS_THINKING = 2500;
const PRE_SPEECH_PAD_MS = 800;
// Raised above the library defaults (0.3 / 0.25 / 400ms) — the defaults are
// tuned for general-purpose use and fire on ambient room noise (fan hum,
// typing, a chair creak) more readily than this surface can tolerate, since
// every raw speech-start here is a candidate barge-in trigger that stops the
// AI's audio. Conservative thresholds mean occasionally needing to speak up
// a beat sooner/clearer, which is a far better failure mode than the AI
// getting interrupted by background noise. Kept as named constants (not
// inlined) since these are the first thing to retune from real usage.
const POSITIVE_SPEECH_THRESHOLD = 0.55;
const NEGATIVE_SPEECH_THRESHOLD = 0.4;
const MIN_SPEECH_MS = 600;

export type TurnDetectorEvents = {
  /** Speech onset detected — may still turn out to be a misfire (see onMisfire).
   *  Fine for snappy UI feedback (waveform, status label) but NOT confident
   *  enough to act on (e.g. barge-in) — use onSpeechRealStart for that. */
  onSpeechStart?: () => void;
  /** Speech onset CONFIRMED past MIN_SPEECH_MS — i.e. not a misfire. This is
   *  the signal to actually act on (barge-in, rambling-clock start), since
   *  it's already passed the noise-vs-speech confidence bar. */
  onSpeechRealStart?: () => void;
  /** A complete utterance ended; audio is a ready-to-upload WAV Blob. */
  onUtterance: (audio: Blob) => void;
  /** Speech was detected but discarded as noise (shorter than MIN_SPEECH_MS). */
  onMisfire?: () => void;
  /** Per-frame speech probability (0..1) — drives the HUD waveform / amplitude meter. */
  onAmplitude?: (isSpeech: number) => void;
};

export type TurnDetectorHandle = {
  /** Requests mic permission and starts listening. Throws on denial/unsupported — caller must catch. */
  enable: () => Promise<void>;
  /** Stops listening without tearing down the model (cheap to resume). If a segment is
   *  mid-flight, flushes it as a completed utterance first (submitUserSpeechOnPause). */
  pause: () => Promise<void>;
  /** Resumes listening after pause() — does not re-prompt for mic permission. */
  resume: () => Promise<void>;
  /** Fully releases the mic stream, audio context, and model. Call on session end/unmount. */
  destroy: () => Promise<void>;
  /** Widens/restores the pause tolerance — 'thinking' after an explicit
   *  "give me a moment" request, 'normal' otherwise. Thin wrapper over
   *  MicVAD's own setOptions; never prompts for permission or touches the
   *  mic stream, just the redemption timing. */
  setPatience: (mode: 'normal' | 'thinking') => void;
};

/**
 * Loads the VAD model (no mic prompt yet) and returns a handle. Call
 * `.enable()` in response to a user gesture to actually request the
 * microphone and start listening.
 */
export async function createTurnDetector(events: TurnDetectorEvents): Promise<TurnDetectorHandle> {
  const { MicVAD } = await import('@ricky0123/vad-web');

  const vad = await MicVAD.new({
    model: 'v5',
    baseAssetPath: ASSET_BASE,
    onnxWASMBasePath: ASSET_BASE,
    startOnLoad: false,
    redemptionMs: REDEMPTION_MS,
    preSpeechPadMs: PRE_SPEECH_PAD_MS,
    minSpeechMs: MIN_SPEECH_MS,
    positiveSpeechThreshold: POSITIVE_SPEECH_THRESHOLD,
    negativeSpeechThreshold: NEGATIVE_SPEECH_THRESHOLD,
    // Lets us force-flush a long-running segment by calling pause() then
    // resume() — used for the "candidate has been talking a long time"
    // nudge (see rambling-tracker.ts) without needing a streaming STT vendor.
    submitUserSpeechOnPause: true,
    onSpeechStart: () => events.onSpeechStart?.(),
    onSpeechRealStart: () => events.onSpeechRealStart?.(),
    onSpeechEnd: (audio) => events.onUtterance(encodeWavBlob(audio)),
    onVADMisfire: () => events.onMisfire?.(),
    onFrameProcessed: (probs) => events.onAmplitude?.(probs.isSpeech),
  });

  return {
    enable: () => vad.start(),
    pause: () => vad.pause(),
    resume: () => vad.start(),
    // MicVAD.destroy() throws ("null stream, audio context, or processor
    // adapter") if called before start() ever ran — a real gap in the
    // library, hit immediately in dev via React StrictMode's mount → cleanup
    // → remount cycle (a component can mount, load the model, and unmount
    // before the user ever clicked "enable"). Cleanup must never throw.
    destroy: async () => {
      try {
        await vad.destroy();
      } catch (err) {
        console.warn('[turn-detector] destroy on a never-started VAD instance (safe to ignore)', err);
      }
    },
    setPatience: (mode) => {
      try {
        vad.setOptions({ redemptionMs: mode === 'thinking' ? REDEMPTION_MS_THINKING : REDEMPTION_MS });
      } catch (err) {
        console.warn('[turn-detector] setPatience failed (non-fatal, keeps prior timing)', err);
      }
    },
  };
}
