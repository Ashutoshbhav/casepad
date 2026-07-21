'use client';

// LiveMicInput — voice-first, auto-send input for the live interviewer.
// Sibling to <MicButton>, not a replacement: MicButton (used in /solve) drops
// the transcript into an editable box because Indian-English Whisper WER can
// mangle terms and the user should get to fix it before sending. This
// component deliberately does NOT do that — the live interview is meant to
// simulate real, unrehearsed interview pressure (speak once, no edits), per
// the product decision behind this feature.
//
// Turn-taking contract: mutual exclusion, not tuning. This component is
// `disabled` for the entire duration the interviewer's turn is generating
// and playing — it structurally cannot record while the interviewer is
// "speaking", so it can never talk over the user. See <LiveInterviewSession>
// for how `disabled` is driven.
//
// Never-fail contract: STT failure calls `onSttFailed()` so the parent can
// show a plain text input for that turn instead — the interview keeps going
// either way, voice degrades, the session doesn't.

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const MAX_RECORD_MS = 120_000; // Same hard cap as MicButton — Groq STT budget.

type MicState = 'idle' | 'recording' | 'transcribing' | 'error';

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
  return '';
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

export function LiveMicInput({
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
  const aliveRef = useRef<boolean>(true);

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
      const fd = new FormData();
      fd.append('audio', blob, 'recording');
      fd.append('sessionId', sessionId);
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          res.status === 401
            ? 'Sign in to use voice'
            : res.status === 413
              ? 'Recording too long'
              : res.status === 503
                ? 'Voice service busy — try again, or type this turn'
                : (data?.error as string) || 'Transcription failed — type this turn instead';
        showError(msg);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      if (!text || !text.trim()) {
        showError('No speech detected — try again, or type this turn');
        return;
      }
      setState('idle');
      onAutoSend(text.trim());
    } catch (err) {
      console.error('[LiveMicInput] transcribe failed', err);
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
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      console.warn('[LiveMicInput] getUserMedia denied', err);
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
      console.error('[LiveMicInput] MediaRecorder construct failed', err);
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
      const blob = new Blob(collected, { type: blobType });
      void transcribeAndSend(blob);
    };
    recorder.onerror = (e) => {
      console.error('[LiveMicInput] recorder error', e);
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
      console.error('[LiveMicInput] recorder start failed', err);
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
        console.error('[LiveMicInput] stop failed', err);
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
          background: isRecording ? 'var(--color-signal-danger, #D94B4B)' : 'var(--color-accent)',
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

      <span
        className="font-mono text-[11px] uppercase tracking-wide text-center"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
        {isRecording && <> · {formatTimer(elapsedMs)} / 2:00</>}
      </span>

      {state === 'error' && errorMsg && (
        <span
          role="alert"
          className="text-[11px] px-3 py-1.5 rounded-md text-center max-w-xs"
          style={{
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-signal-danger, #D94B4B)',
            border: '1px solid var(--color-signal-danger, #D94B4B)',
          }}
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
      style={{
        width: 22,
        height: 22,
        borderRadius: 9999,
        background: '#fff',
        animation: `${pulseAnim} ${pulseDuration} ease-in-out infinite`,
      }}
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
