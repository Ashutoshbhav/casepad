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
import { createTurnDetector, type TurnDetectorHandle } from '@/lib/voice/turn-detector';
import {
  initialRamblingState,
  onSpeechStart as ramblingOnSpeechStart,
  onTurnSent as ramblingOnTurnSent,
  shouldNudge,
  type RamblingTrackerState,
} from '@/lib/voice/rambling-tracker';

const MAX_RECORD_MS = 120_000; // Same hard cap as MicButton — Groq STT budget.
const NUDGE_CHECK_INTERVAL_MS = 2000;

export type Phase = 'interviewer_speaking' | 'processing' | 'candidate_turn';
export type ListenerStatus =
  | 'loading'
  | 'needs_permission'
  | 'listening'
  | 'speaking'
  | 'transcribing'
  | 'ptt_fallback'
  | 'unsupported';

async function transcribe(sessionId: string, blob: Blob, filename: string): Promise<string | null> {
  const fd = new FormData();
  fd.append('audio', blob, filename);
  fd.append('sessionId', sessionId);
  const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const { text } = (await res.json()) as { text: string };
  return text?.trim() || null;
}

export function LiveMicInput({
  sessionId,
  phase,
  onAutoSend,
  onBargeIn,
  onSttFailed,
  onStatusChange,
  onAmplitude,
}: {
  sessionId: string;
  phase: Phase;
  onAutoSend: (text: string) => void;
  onBargeIn: () => void;
  onSttFailed: (reason: string) => void;
  onStatusChange?: (status: ListenerStatus) => void;
  onAmplitude?: (level: number) => void;
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

  const setStatusReported = (s: ListenerStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  const handleUtterance = async (audio: Blob) => {
    // A previous turn is still in flight — ignore rather than double-submit.
    // Rare: the candidate started talking again immediately after their own
    // turn sent, before the interviewer's reply landed.
    if (phaseRef.current === 'processing') {
      setStatusReported('listening');
      return;
    }
    setStatusReported('transcribing');
    try {
      const text = await transcribe(sessionId, audio, 'utterance.wav');
      if (!aliveRef.current) return;
      if (!text) {
        setStatusReported('listening');
        return;
      }
      onAutoSend(text);
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
        setStatusReported('needs_permission');
      })
      .catch((err) => {
        console.warn('[LiveMicInput] VAD model failed to load, falling back to push-to-talk', err);
        if (!cancelled) setStatusReported('ptt_fallback');
      });

    return () => {
      aliveRef.current = false;
      cancelled = true;
      handleRef.current?.destroy().catch(() => {});
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rambling nudge: force-flush a segment that's run long without a natural
  // pause, so it doesn't sit silent for a minute-plus with no interviewer
  // response. See rambling-tracker.ts for why this approximates "the AI can
  // interrupt" without streaming STT.
  useEffect(() => {
    const id = setInterval(() => {
      if (!handleRef.current) return;
      if (status !== 'speaking') return;
      if (!shouldNudge(ramblingRef.current, Date.now())) return;
      const handle = handleRef.current;
      void handle.pause().then(() => handle.resume());
    }, NUDGE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
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
}: {
  status: ListenerStatus;
  errorMsg: string | null;
  barsRef: RefObject<HTMLDivElement | null>;
  onEnable: () => void;
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
  onAutoSend: (text: string) => void;
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
      const text = await transcribe(sessionId, blob, 'recording');
      if (!text) {
        showError('No speech detected — try again, or type this turn');
        return;
      }
      setState('idle');
      onAutoSend(text);
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
