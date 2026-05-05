'use client';

// MicButton — voice recording → Whisper transcription, drops result into the
// chat input for the user to edit before sending. Lives next to the chat
// input row in <ChatPanel />. Never auto-submits (Indian-English Whisper WER
// can mangle "DCF" into "decaf" — user must get a chance to fix it).
//
// State machine: idle → recording → transcribing → idle
//                 (any state can fall to "error" → idle after 3s)

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';

const MAX_RECORD_MS = 120_000; // Hard cap at 2 minutes, matches API budget.

type MicState = 'idle' | 'recording' | 'transcribing' | 'error';

// Pick the best supported MIME type for this browser. iOS Safari only emits
// audio/mp4; everything else prefers webm/opus (smaller, faster upload).
function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  // Last-ditch: empty string lets the browser pick its default.
  return '';
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

export function MicButton({
  onTranscript,
  disabled,
  sessionId,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  sessionId?: string;
}) {
  const [state, setState] = useState<MicState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether we should still upload+transcribe the recorded audio when
  // it stops. Set to false on unmount/cancel so an orphaned MediaRecorder
  // event doesn't fire a network request after the user has navigated away.
  const aliveRef = useRef<boolean>(true);

  const reduced = useReducedMotion();

  // Cleanup on unmount: stop any active recording, release the mic stream,
  // clear timers. aliveRef guards the recorder.onstop handler so it doesn't
  // try to upload after we're gone.
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
      // Clear listening on unmount so the persistent asterisk doesn't
      // stay locked in glow-pulse if the user navigates mid-recording.
      try {
        useAsteriskSceneStore.getState().setAiState('idle');
      } catch {
        // ignore — store glitch shouldn't block teardown
      }
    };
  }, []);

  // Drive the persistent asterisk's aiState — 'listening' while
  // recording, 'idle' otherwise. Last-writer-wins, so if a chat stream
  // is mid-flight when the user starts recording, listening wins.
  // Transcribing is treated as idle (the brief processing window
  // doesn't need its own visual state — Spinner on the button is enough).
  useEffect(() => {
    try {
      if (state === 'recording') {
        useAsteriskSceneStore.getState().setAiState('listening');
      } else if (state === 'idle' || state === 'error') {
        useAsteriskSceneStore.getState().setAiState('idle');
      }
    } catch (e) {
      console.warn('[mic-button] setAiState failed:', e);
    }
  }, [state]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setState('error');
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

  const transcribe = async (blob: Blob) => {
    setState('transcribing');
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording');
      if (sessionId) fd.append('sessionId', sessionId);
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          res.status === 401
            ? 'Sign in to use voice'
            : res.status === 413
              ? 'Recording too long'
              : res.status === 503
                ? 'Voice service busy — try again'
                : (data?.error as string) || 'Transcription failed';
        showError(msg);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      if (!text || !text.trim()) {
        showError('No speech detected');
        return;
      }
      onTranscript(text.trim());
      setState('idle');
    } catch (err) {
      console.error('[MicButton] transcribe failed', err);
      showError('Transcription failed');
    }
  };

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showError('Voice not supported in this browser');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      console.warn('[MicButton] getUserMedia denied', err);
      showError('Mic access blocked');
      return;
    }

    const mime = pickMimeType();
    if (mime === null) {
      stream.getTracks().forEach((t) => t.stop());
      showError('Voice not supported in this browser');
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error('[MicButton] MediaRecorder construct failed', err);
      stream.getTracks().forEach((t) => t.stop());
      showError('Voice not supported in this browser');
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
        showError('No audio captured');
        return;
      }
      const blob = new Blob(collected, { type: blobType });
      void transcribe(blob);
    };
    recorder.onerror = (e) => {
      console.error('[MicButton] recorder error', e);
      releaseStream();
      showError('Recording failed');
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsedMs(0);

    try {
      recorder.start();
    } catch (err) {
      console.error('[MicButton] recorder start failed', err);
      releaseStream();
      showError('Recording failed');
      return;
    }

    setState('recording');

    // Live timer for the "0:14 / 2:00" readout.
    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);

    // Hard cap — auto-stop at MAX_RECORD_MS so users don't accidentally blow
    // through the 25 MB cap or the 120s budget we promised.
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
        console.error('[MicButton] stop failed', err);
        showError('Recording failed');
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  const isBusy = state === 'transcribing';
  const isRecording = state === 'recording';
  const ariaLabel = isRecording ? 'Stop recording' : 'Record voice answer';

  // Pulse animation: keyframes scale + opacity. Reduced-motion users get a
  // slower opacity-only pulse so they still see the recording-active cue.
  const pulseDuration = reduced ? '2.4s' : '1.2s';
  const pulseAnim = reduced ? 'mic-pulse-reduced' : 'mic-pulse';

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={onKeyDown}
        disabled={disabled || isBusy}
        aria-label={ariaLabel}
        aria-pressed={isRecording}
        title={ariaLabel}
        className="flex items-center justify-center rounded-md transition-opacity disabled:opacity-50 hover:opacity-90 focus:outline-none focus-visible:ring-2"
        style={{
          width: 40,
          height: 40,
          background: isRecording
            ? 'var(--color-signal-danger, #D94B4B)'
            : 'var(--color-bg-elevated)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isRecording
            ? 'var(--color-signal-danger, #D94B4B)'
            : 'var(--color-border)',
        }}
      >
        {isBusy ? (
          <Spinner />
        ) : isRecording ? (
          <RecordingDot pulseAnim={pulseAnim} pulseDuration={pulseDuration} />
        ) : (
          <MicGlyph color="var(--color-accent)" />
        )}
      </button>

      {/* Live timer floats above the button while recording. */}
      {isRecording && (
        <span
          className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-wide whitespace-nowrap"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {formatTimer(elapsedMs)} / 2:00
        </span>
      )}

      {/* Inline error toast — appears above the button, auto-dismisses. */}
      {state === 'error' && errorMsg && (
        <span
          role="alert"
          className="pointer-events-none absolute -top-7 right-0 text-[10px] px-2 py-1 rounded-md whitespace-nowrap"
          style={{
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-signal-danger, #D94B4B)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-signal-danger, #D94B4B)',
          }}
        >
          {errorMsg}
        </span>
      )}

      {/* Local pulse + spinner keyframes. Scoped via styled-jsx so they
          don't leak into globals. */}
      <style jsx>{`
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.55; }
        }
        @keyframes mic-pulse-reduced {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes mic-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function MicGlyph({ color }: { color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function RecordingDot({
  pulseAnim,
  pulseDuration,
}: {
  pulseAnim: string;
  pulseDuration: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 12,
        height: 12,
        borderRadius: 9999,
        background: '#fff',
        animation: `${pulseAnim} ${pulseDuration} ease-in-out infinite`,
      }}
    />
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 16,
        borderRadius: 9999,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        animation: 'mic-spin 0.7s linear infinite',
      }}
    />
  );
}
