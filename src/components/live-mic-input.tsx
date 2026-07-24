'use client';

// LiveMicInput — hands-free, VAD-driven voice input for the live interviewer.
// Sibling to <MicButton>, not a replacement: MicButton (used in /solve) drops
// the transcript into an editable box because Indian-English Whisper WER can
// mangle terms and the user should get to fix it before sending. This
// component deliberately does NOT do that — the live interview is meant to
// simulate real, unrehearsed interview pressure (speak once, no edits), per
// the product decision behind this feature.
//
// Interaction model: hands-free, not push-to-talk. A voice-activity detector
// (turn-detector.ts, wrapping @ricky0123/vad-web) listens continuously once
// the candidate opts in via an explicit "Enable microphone" gesture, and
// auto-sends each utterance on a natural pause — no button per turn.
//
// Barge-in: this component stays mounted and listening even while the
// interviewer is "speaking" (the parent no longer disables it during that
// phase) — `onBargeIn` fires the moment speech is detected during that phase
// so the parent can stop the AI's audio immediately. See
// <LiveInterviewSession> for how phase drives this.
//
// Never-fail 3-tier ladder: hands-free VAD -> push-to-talk (if the VAD
// model/WASM fails to load, or getUserMedia/AudioContext construction fails)
// -> plain text (if voice is unsupported at all, or push-to-talk STT itself
// fails for a turn). The push-to-talk tier is the same MediaRecorder logic
// this file used before hands-free existed — kept as the safety net rather
// than deleted, since it's already written and tested.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  createTurnDetector,
  CONFIDENT_SPEECH_PROBABILITY,
  type TurnDetectorHandle,
} from '@/lib/voice/turn-detector';
import {
  initialRamblingState,
  onSpeechStart as ramblingOnSpeechStart,
  onTurnSent as ramblingOnTurnSent,
  shouldNudge,
  type RamblingTrackerState,
} from '@/lib/voice/rambling-tracker';
import { isThinkingTimeRequest } from '@/lib/interview/thinking-time';

const MAX_RECORD_MS = 120_000; // Same hard cap as MicButton — Groq STT budget.
const NUDGE_CHECK_INTERVAL_MS = 2000;
// How long widened pause-tolerance ("thinking" patience) stays on before
// auto-reverting even if the candidate never sends another turn — a safety
// net so a missed revert can't permanently slow down turn-taking.
const THINKING_PATIENCE_MS = 90_000;
// Stuck-segment watchdog: MicVAD only ends a segment once speech
// probability sits below its negative threshold for redemptionMs straight.
// Ambient noise can hold the probability in the gray zone between the two
// thresholds indefinitely — the segment never closes and the UI reads
// "hearing you" long after the candidate stopped (reported live by Ash).
// If no CONFIDENT speech frame has arrived for this long while a segment
// is open, force-flush it (pause→resume, submitUserSpeechOnPause sends
// whatever was captured). Must comfortably exceed REDEMPTION_MS (650ms) so
// the VAD's own end-of-turn always wins when it's working; the thinking
// variant must exceed REDEMPTION_MS_THINKING (2500ms) for the same reason.
// Windows widened from the first-shipped 3000/6500 after a live session
// showed the 3s version AMPUTATING soft continuous speech mid-sentence: on
// a quiet laptop mic, genuine speech can sit in the same 0.4–0.55 gray
// zone as noise, and probability-alone can't tell them apart — so the
// watchdog must be slow enough that a real speaker would have to go a full
// conversational beat without one confident frame before it fires.
const STUCK_SILENCE_MS = 5000;
const STUCK_SILENCE_THINKING_MS = 9000;
const STUCK_CHECK_INTERVAL_MS = 500;

export type Phase = 'interviewer_speaking' | 'processing' | 'candidate_turn';
export type ListenerStatus =
  | 'loading'
  | 'needs_permission'
  | 'listening'
  | 'speaking'
  | 'transcribing'
  | 'ptt_fallback'
  | 'unsupported';

type TranscribeResult = { text: string; lowConfidence: boolean };

async function transcribe(sessionId: string, blob: Blob, filename: string): Promise<TranscribeResult | null> {
  const fd = new FormData();
  fd.append('audio', blob, filename);
  fd.append('sessionId', sessionId);
  const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const { text, lowConfidence } = (await res.json()) as { text: string; lowConfidence?: boolean };
  const trimmed = text?.trim();
  return trimmed ? { text: trimmed, lowConfidence: Boolean(lowConfidence) } : null;
}

export function LiveMicInput({
  sessionId,
  phase,
  onAutoSend,
  onBargeIn,
  onSttFailed,
  onStatusChange,
  onAmplitude,
  patienceDefault = 'normal',
}: {
  sessionId: string;
  phase: Phase;
  onAutoSend: (text: string, lowConfidence?: boolean) => void;
  onBargeIn: () => void;
  onSttFailed: (reason: string) => void;
  onStatusChange?: (status: ListenerStatus) => void;
  onAmplitude?: (level: number) => void;
  /**
   * Baseline pause tolerance. Behavioral/story sessions should pass
   * 'thinking' — telling a story has natural 1-2s pauses that the normal
   * conversational tolerance amputates mid-sentence (reported live).
   */
  patienceDefault?: 'normal' | 'thinking';
}) {
  const [status, setStatus] = useState<ListenerStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleRef = useRef<TurnDetectorHandle | null>(null);
  const ramblingRef = useRef<RamblingTrackerState>(initialRamblingState);
  const aliveRef = useRef(true);
  // Bars are driven by direct DOM mutation in the amplitude callback below,
  // not React state — frames arrive at ~30Hz (one per VAD frame) and routing
  // that through setState would mean a re-render per frame for a purely
  // visual effect. See onAmplitude in createTurnDetector() below.
  const barsRef = useRef<HTMLDivElement>(null);
  // 'normal' | 'thinking' — mirrors what was last told to turn-detector's
  // setPatience so handleUtterance can decide whether a substantive (non
  // thinking-time) turn should revert it, without re-deriving state from
  // the detector itself. Reverts go back to patienceDefault, not a
  // hardcoded 'normal' — behavioral sessions live in 'thinking' baseline.
  const patienceDefaultRef = useRef<'normal' | 'thinking'>(patienceDefault);
  useEffect(() => {
    patienceDefaultRef.current = patienceDefault;
  }, [patienceDefault]);
  const patienceModeRef = useRef<'normal' | 'thinking'>(patienceDefault);
  const patienceRevertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Utterances that complete while a turn is already in flight
  // (phase === 'processing') are transcribed and BUFFERED here, then
  // auto-sent when the phase returns to candidate_turn. The first version
  // of this file silently DISCARDED them — so when the VAD chopped a
  // sentence early and the candidate kept talking over the processing
  // window, the continuation of their answer simply vanished, which read
  // as "it never listens to my whole sentences" (reported live).
  const pendingTextsRef = useRef<string[]>([]);
  // Stuck-segment watchdog state: when the last CONFIDENT speech frame
  // arrived, and whether a force-flush is already in flight (pause→resume
  // is async; firing it twice concurrently would double-flush).
  const lastConfidentSpeechTsRef = useRef(0);
  const flushInFlightRef = useRef(false);
  const errorClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatusReported = (s: ListenerStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  const showTransientError = (msg: string) => {
    setErrorMsg(msg);
    if (errorClearTimerRef.current) clearTimeout(errorClearTimerRef.current);
    errorClearTimerRef.current = setTimeout(() => setErrorMsg(null), 3500);
  };

  // Force the current segment to end NOW — pause() flushes captured audio
  // as a completed utterance (submitUserSpeechOnPause), resume() re-arms.
  // Used by the automatic stuck-segment watchdog, the rambling nudge, and
  // the manual "Done — send" escape hatch; sub-MIN_SPEECH_MS captures
  // surface as a misfire, which correctly drops back to listening.
  // CRITICAL: resume() must be attempted even when pause() rejects — the
  // first version chained .then(resume) so a pause() failure left the mic
  // permanently paused while the UI still said LISTENING (the "stuck
  // listening, mic dead" report). Each step now fails independently.
  const forceFlush = () => {
    const handle = handleRef.current;
    if (!handle || flushInFlightRef.current) return;
    flushInFlightRef.current = true;
    void handle
      .pause()
      .catch((err) => console.warn('[LiveMicInput] flush pause failed (still resuming)', err))
      .then(() => handle.resume())
      .catch((err) => console.warn('[LiveMicInput] flush resume failed', err))
      .finally(() => {
        // Fresh watchdog clock — without this, a stale timestamp could
        // refire the watchdog the instant a new segment opens.
        lastConfidentSpeechTsRef.current = Date.now();
        flushInFlightRef.current = false;
      });
  };

  const revertPatience = () => {
    if (patienceRevertTimerRef.current) {
      clearTimeout(patienceRevertTimerRef.current);
      patienceRevertTimerRef.current = null;
    }
    if (patienceModeRef.current !== patienceDefaultRef.current) {
      patienceModeRef.current = patienceDefaultRef.current;
      handleRef.current?.setPatience(patienceDefaultRef.current);
    }
  };

  const handleUtterance = async (audio: Blob) => {
    // A previous turn is still in flight. Do NOT discard — when the VAD
    // ends a segment early and the candidate keeps talking through the
    // processing window, this utterance IS the rest of their answer.
    // Transcribe it and buffer; the phase-watcher effect below auto-sends
    // it the moment the turn slot frees up.
    if (phaseRef.current === 'processing') {
      try {
        const result = await transcribe(sessionId, audio, 'utterance.wav');
        if (result?.text) pendingTextsRef.current.push(result.text);
      } catch (err) {
        console.warn('[LiveMicInput] buffering mid-processing utterance failed', err);
      }
      if (aliveRef.current) setStatusReported('listening');
      return;
    }
    setStatusReported('transcribing');
    try {
      const result = await transcribe(sessionId, audio, 'utterance.wav');
      if (!aliveRef.current) return;
      if (!result) {
        // Whisper heard nothing usable. Say so — silently dropping back to
        // "listening" here reads, from the candidate's seat, as the app
        // ignoring an answer they just gave.
        showTransientError('Didn’t catch that — try again, or type this turn');
        setStatusReported('listening');
        return;
      }
      const { text, lowConfidence } = result;
      // Widen pause tolerance so halting/muttering "thinking out loud"
      // doesn't fragment into several auto-sent turns; a substantive turn
      // after that reverts back to normal conversational pacing. See
      // src/lib/voice/turn-detector.ts's setPatience + REDEMPTION_MS_THINKING.
      if (isThinkingTimeRequest(text)) {
        if (patienceRevertTimerRef.current) clearTimeout(patienceRevertTimerRef.current);
        patienceModeRef.current = 'thinking';
        handleRef.current?.setPatience('thinking');
        patienceRevertTimerRef.current = setTimeout(revertPatience, THINKING_PATIENCE_MS);
      } else {
        revertPatience();
      }
      onAutoSend(text, lowConfidence);
      setStatusReported('listening');
    } catch (err) {
      console.error('[LiveMicInput] transcribe failed', err);
      if (aliveRef.current) setStatusReported('listening');
    }
  };

  // Load the VAD model on mount (no mic prompt yet — see turn-detector.ts).
  // Failure here means the hands-free tier isn't available at all; drop
  // straight to the push-to-talk fallback without ever showing an "enable
  // microphone" control for a system that can't actually start.
  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;

    createTurnDetector({
      // Raw onset — fine for immediate visual feedback (bars/label), but NOT
      // confident enough yet to act on. Deliberately does NOT trigger
      // barge-in or the rambling clock; see onSpeechRealStart below for why.
      onSpeechStart: () => {
        // Fresh segment — start the stuck-watchdog clock from now so a
        // stale timestamp from a previous turn can't trigger an instant
        // flush the moment this one opens.
        lastConfidentSpeechTsRef.current = Date.now();
        setStatusReported('speaking');
      },
      // Confirmed past MIN_SPEECH_MS — i.e. the model is done disambiguating
      // this from background noise (a fan, typing, a chair creak). Barge-in
      // and the rambling clock both wait for this rather than the raw
      // onset, specifically because a false-positive barge-in interrupts the
      // AI's actual audio — a much costlier mistake than a half-second of UI
      // lag on a real interruption.
      onSpeechRealStart: () => {
        if (phaseRef.current === 'interviewer_speaking') onBargeIn();
        ramblingRef.current = ramblingOnSpeechStart(ramblingRef.current, Date.now());
      },
      onUtterance: (audio) => {
        ramblingRef.current = ramblingOnTurnSent();
        void handleUtterance(audio);
      },
      onMisfire: () => {
        // The raw onset above already flipped status to 'speaking' — this
        // was noise, not a real utterance, so revert.
        setStatusReported('listening');
      },
      onAmplitude: (level) => {
        if (level >= CONFIDENT_SPEECH_PROBABILITY) {
          lastConfidentSpeechTsRef.current = Date.now();
        }
        onAmplitude?.(level);
        paintBars(barsRef.current, level);
      },
    })
      .then((handle) => {
        if (cancelled) {
          void handle.destroy();
          return;
        }
        handleRef.current = handle;
        // Apply the session's baseline pause tolerance (behavioral/story
        // sessions run on 'thinking' from the first turn — see
        // patienceDefault prop).
        if (patienceDefaultRef.current !== 'normal') {
          handle.setPatience(patienceDefaultRef.current);
          patienceModeRef.current = patienceDefaultRef.current;
        }
        setStatusReported('needs_permission');
      })
      .catch((err) => {
        console.warn('[LiveMicInput] VAD model failed to load, falling back to push-to-talk', err);
        if (!cancelled) setStatusReported('ptt_fallback');
      });

    return () => {
      aliveRef.current = false;
      cancelled = true;
      if (patienceRevertTimerRef.current) clearTimeout(patienceRevertTimerRef.current);
      if (errorClearTimerRef.current) clearTimeout(errorClearTimerRef.current);
      handleRef.current?.destroy().catch(() => {});
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush buffered continuation text the moment the turn slot frees up —
  // the second half of the "never discard the candidate's words" fix.
  useEffect(() => {
    if (phase !== 'candidate_turn') return;
    if (pendingTextsRef.current.length === 0) return;
    const text = pendingTextsRef.current.join(' ').trim();
    pendingTextsRef.current = [];
    if (text) onAutoSend(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Stuck-segment watchdog (guardrail for "it keeps listening after I'm
  // done"): while a segment is open ('speaking'), if no confident speech
  // frame has arrived for STUCK_SILENCE_MS, the segment is being held open
  // by gray-zone ambient noise — force-flush it so the turn actually sends.
  // Wider tolerance in 'thinking' patience mode, where halting muttering
  // legitimately sits near the threshold for long stretches.
  useEffect(() => {
    if (status !== 'speaking') return;
    const id = setInterval(() => {
      const limit =
        patienceModeRef.current === 'thinking' ? STUCK_SILENCE_THINKING_MS : STUCK_SILENCE_MS;
      if (Date.now() - lastConfidentSpeechTsRef.current >= limit) {
        console.warn('[LiveMicInput] stuck segment (no confident speech for', limit, 'ms) — force-flushing');
        forceFlush();
      }
    }, STUCK_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Rambling nudge: force-flush a segment that's run long without a natural
  // pause, so it doesn't sit silent for a minute-plus with no interviewer
  // response. See rambling-tracker.ts for why this approximates "the AI can
  // interrupt" without streaming STT.
  useEffect(() => {
    const id = setInterval(() => {
      if (!handleRef.current) return;
      if (status !== 'speaking') return;
      if (!shouldNudge(ramblingRef.current, Date.now())) return;
      // Same safe flush as the watchdog/Done button — the old inline
      // pause().then(resume) here had the identical dead-mic-on-pause-
      // failure gap forceFlush() now guards against.
      forceFlush();
    }, NUDGE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const enable = async () => {
    if (!handleRef.current) return;
    try {
      await handleRef.current.enable();
      setStatusReported('listening');
    } catch (err) {
      console.warn('[LiveMicInput] mic permission denied/unavailable, falling back to push-to-talk', err);
      setStatusReported('ptt_fallback');
    }
  };

  if (status === 'ptt_fallback') {
    return (
      <PushToTalkFallback
        sessionId={sessionId}
        disabled={phase !== 'candidate_turn'}
        onAutoSend={onAutoSend}
        onSttFailed={(reason) => {
          setStatusReported('unsupported');
          onSttFailed(reason);
        }}
      />
    );
  }

  if (status === 'unsupported') {
    return null; // parent renders the plain text fallback once onSttFailed has fired
  }

  return (
    <HandsFreeIndicator
      status={status}
      errorMsg={errorMsg}
      barsRef={barsRef}
      onEnable={() => {
        setErrorMsg(null);
        void enable();
      }}
      onDone={forceFlush}
    />
  );
}

// Scales each bar's height directly off the model's per-frame speech
// probability (0..1) — genuinely reactive, not a canned CSS loop. Bars share
// the same base level with a small per-index phase offset so the row doesn't
// look perfectly flat (we only have one probability value per frame, not a
// frequency spectrum, so this fakes just enough visual variety to read as
// "alive" without pretending to be a real spectrum analyzer).
function paintBars(container: HTMLDivElement | null, level: number) {
  if (!container) return;
  const bars = container.children;
  const clamped = Math.max(0, Math.min(1, level));
  for (let i = 0; i < bars.length; i++) {
    const el = bars[i] as HTMLElement;
    const phase = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.3));
    const height = 6 + clamped * 34 * phase;
    el.style.height = `${height}px`;
    el.style.opacity = clamped > 0.05 ? '1' : '0.5';
  }
}

// ---------------------------------------------------------------------------
// Tier 1 UI: hands-free status indicator (no button per turn — see HUD note
// in live-interview-session.tsx for the cyberpunk framing around this).
// ---------------------------------------------------------------------------

function HandsFreeIndicator({
  status,
  errorMsg,
  barsRef,
  onEnable,
  onDone,
}: {
  status: ListenerStatus;
  errorMsg: string | null;
  barsRef: RefObject<HTMLDivElement | null>;
  onEnable: () => void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();

  const label =
    status === 'loading'
      ? 'Loading voice engine…'
      : status === 'needs_permission'
        ? 'Enable microphone to begin'
        : status === 'listening'
          ? 'Listening'
          : status === 'speaking'
            ? 'Hearing you'
            : status === 'transcribing'
              ? 'Processing…'
              : '';

  // Hardcoded HUD-cyan colors, not the app's theme tokens (--color-accent
  // etc.) — this component is only ever rendered inside
  // <LiveInterviewSession>'s forced-dark cyberpunk shell, which is itself an
  // intentional exception to the app's light/dark toggle (see that
  // component's header comment). Using the theme tokens here would go
  // invisible against the HUD's near-black background whenever the user's
  // global theme happens to be light mode.
  if (status === 'needs_permission') {
    return (
      <button
        type="button"
        onClick={onEnable}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '12px 20px',
          background: 'transparent',
          border: '1px solid rgba(120, 220, 255, 0.5)',
          color: '#9be7ff',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={barsRef}
        data-live-voice-bars
        className="flex items-end gap-[3px]"
        style={{ height: 40 }}
        aria-hidden="true"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            data-bar-index={i}
            style={{
              width: 3,
              height: 6,
              background: status === 'speaking' ? '#ffd682' : '#9be7ff',
              opacity: 0.5,
              transition: reduced ? 'none' : 'height 80ms linear, opacity 80ms linear',
              display: 'block',
            }}
          />
        ))}
      </div>
      <span
        className="font-mono text-[11px] uppercase tracking-wide"
        style={{ color: 'rgba(215, 236, 255, 0.6)' }}
        aria-live="polite"
      >
        {label}
      </span>
      {/* Manual end-of-turn escape hatch — whatever the VAD believes, the
          candidate can always force their answer to send. Only meaningful
          while a segment is actually open ('speaking'); when merely
          listening there is no captured audio to flush. */}
      {status === 'speaking' && (
        <button
          type="button"
          onClick={onDone}
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 600,
            fontSize: 12,
            padding: '7px 16px',
            background: 'transparent',
            border: '1px solid rgba(238, 240, 244, 0.35)',
            borderRadius: 999,
            color: 'rgba(238, 240, 244, 0.85)',
            cursor: 'pointer',
          }}
        >
          ✓ Done — send it
        </button>
      )}
      {errorMsg && (
        <span role="alert" className="text-[11px]" style={{ color: '#ff8a8a' }}>
          {errorMsg}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier 2 fallback: push-to-talk, unchanged in behavior from the original
// implementation of this file — used only when the hands-free VAD tier
// couldn't load or the mic permission was denied.
// ---------------------------------------------------------------------------

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

type PttState = 'idle' | 'recording' | 'transcribing' | 'error';

function PushToTalkFallback({
  sessionId,
  disabled,
  onAutoSend,
  onSttFailed,
}: {
  sessionId: string;
  disabled?: boolean;
  onAutoSend: (text: string, lowConfidence?: boolean) => void;
  onSttFailed: (reason: string) => void;
}) {
  const [state, setState] = useState<PttState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (errorClearRef.current) clearTimeout(errorClearRef.current);
    };
  }, []);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setState('error');
    onSttFailed(msg);
    if (errorClearRef.current) clearTimeout(errorClearRef.current);
    errorClearRef.current = setTimeout(() => {
      setErrorMsg(null);
      setState('idle');
    }, 3000);
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  const transcribeAndSend = async (blob: Blob) => {
    setState('transcribing');
    try {
      const result = await transcribe(sessionId, blob, 'recording');
      if (!result) {
        showError('No speech detected — try again, or type this turn');
        return;
      }
      setState('idle');
      onAutoSend(result.text, result.lowConfidence);
    } catch (err) {
      console.error('[PushToTalkFallback] transcribe failed', err);
      showError('Transcription failed — type this turn instead');
    }
  };

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showError('Voice not supported in this browser — type this turn instead');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      console.warn('[PushToTalkFallback] getUserMedia denied', err);
      showError('Mic access blocked — type this turn instead');
      return;
    }

    const mime = pickMimeType();
    if (mime === null) {
      stream.getTracks().forEach((t) => t.stop());
      showError('Voice not supported in this browser — type this turn instead');
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (err) {
      console.error('[PushToTalkFallback] MediaRecorder construct failed', err);
      stream.getTracks().forEach((t) => t.stop());
      showError('Voice not supported in this browser — type this turn instead');
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const collected = chunksRef.current;
      chunksRef.current = [];
      const blobType = recorder.mimeType || mime || 'audio/webm';
      releaseStream();
      if (!aliveRef.current) return;
      if (collected.length === 0) {
        showError('No audio captured — try again, or type this turn');
        return;
      }
      void transcribeAndSend(new Blob(collected, { type: blobType }));
    };
    recorder.onerror = (e) => {
      console.error('[PushToTalkFallback] recorder error', e);
      releaseStream();
      showError('Recording failed — type this turn instead');
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsedMs(0);

    try {
      recorder.start();
    } catch (err) {
      console.error('[PushToTalkFallback] recorder start failed', err);
      releaseStream();
      showError('Recording failed — type this turn instead');
      return;
    }

    setState('recording');
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250);
    autoStopRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    }, MAX_RECORD_MS);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      try {
        recorderRef.current.stop();
      } catch (err) {
        console.error('[PushToTalkFallback] stop failed', err);
        showError('Recording failed — type this turn instead');
      }
    }
  };

  const handleClick = () => {
    if (disabled || state === 'transcribing') return;
    if (state === 'idle' || state === 'error') {
      void startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing';
  const label = disabled
    ? 'Interviewer is speaking'
    : isRecording
      ? 'Recording — tap to stop and send'
      : isBusy
        ? 'Processing…'
        : 'Tap to speak';

  const pulseDuration = reduced ? '2.4s' : '1.2s';
  const pulseAnim = reduced ? 'live-mic-pulse-reduced' : 'live-mic-pulse';

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isBusy}
        aria-label={label}
        aria-pressed={isRecording}
        title={label}
        className="flex items-center justify-center rounded-full transition-opacity disabled:opacity-40 hover:opacity-90 focus:outline-none focus-visible:ring-2"
        style={{
          width: 88,
          height: 88,
          // Same HUD-cyan palette as the hands-free tier above — this
          // fallback also only ever renders inside the forced-dark HUD shell.
          background: isRecording ? '#ff8a8a' : '#4dc9ea',
          border: 'none',
        }}
      >
        {isBusy ? (
          <BigSpinner />
        ) : isRecording ? (
          <RecordingDot pulseAnim={pulseAnim} pulseDuration={pulseDuration} />
        ) : (
          <MicGlyph />
        )}
      </button>
      <span className="font-mono text-[11px] uppercase tracking-wide text-center" style={{ color: 'rgba(215, 236, 255, 0.6)' }}>
        {label}
        {isRecording && <> · {formatTimer(elapsedMs)} / 2:00</>}
      </span>
      {state === 'error' && errorMsg && (
        <span
          role="alert"
          className="text-[11px] px-3 py-1.5 rounded-md text-center max-w-xs"
          style={{ background: 'rgba(255, 138, 138, 0.1)', color: '#ff8a8a', border: '1px solid #ff8a8a' }}
        >
          {errorMsg}
        </span>
      )}
      <style jsx>{`
        @keyframes live-mic-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.6; }
        }
        @keyframes live-mic-pulse-reduced {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes live-mic-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function MicGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function RecordingDot({ pulseAnim, pulseDuration }: { pulseAnim: string; pulseDuration: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: 22, height: 22, borderRadius: 9999, background: '#fff', animation: `${pulseAnim} ${pulseDuration} ease-in-out infinite` }}
    />
  );
}

function BigSpinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: 9999,
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.35)',
        borderTopColor: '#fff',
        animation: 'live-mic-spin 0.7s linear infinite',
      }}
    />
  );
}
