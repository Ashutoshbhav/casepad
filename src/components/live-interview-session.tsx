'use client';

// LiveInterviewSession — voice-first UI for the live interviewer, backed by
// the SAME /api/chat contract chat-panel.tsx uses (this repo's fortressed
// turn engine), just a different front end: state-driven instead of a
// scrolling bubble list, because a voice interface needs "whose turn is it"
// to be the primary thing on screen, not a chat transcript.
//
// Turn-taking (hands-free, bidirectional barge-in): <LiveMicInput> is now
// mounted continuously for the whole session, including while the
// interviewer is "speaking" — that's what makes barge-in possible. It calls
// `interrupt()` itself (via onBargeIn) the moment it detects the candidate
// talking over the AI; sending a turn while the AI is still "processing" the
// previous one is guarded inside LiveMicInput itself (phase-gated), not here.
// This replaced the original push-to-talk/hard-mutual-exclusion design — see
// git history on this file for that version if you need to compare.
//
// Never-fail: STT failure shows a plain text input for that turn instead of
// blocking (never_fail_stt); TTS failure just renders text with no audio,
// silently, since nothing the user depends on actually failed
// (never_fail_tts). A network stall on the chat call itself aborts and lets
// the candidate try again rather than hanging forever.
//
// Visual: restrained "reactive AI blob" treatment (see live-interview-
// scene.tsx), scoped to this component only (forced dark canvas regardless
// of the app's light/dark toggle — the rest of the app stays on HUPR's
// monochrome system per globals.css; this is a deliberate, bounded exception
// for one full-screen "different mode" surface, not a brand change). Two
// prior structural attempts here — a glass orb with instrument rings, then a
// hard-edged NERV-style dial — were both rejected as busy/cheap. This
// version follows a reference the user pointed to directly: one hero
// object, almost no surrounding chrome. Nearly all of the old dial/ring/
// panel/reticle/hexgrid/scanline chrome is gone; state info is now plain
// unobtrusive text below the blob instead of boxed HUD panels.

import { useEffect, useRef, useState } from 'react';
import { LiveMicInput, type ListenerStatus } from './live-mic-input';
import { LiveInterviewScene } from './live-interview-scene';
import { IssueTreePanel } from './issue-tree-panel';
import { BlobFace } from './blob-face';
import { InlineSubmitCTA } from './inline-submit-cta';

export type GlowState = 'idle' | 'ai' | 'candidate' | 'processing' | 'error';

type Msg = { role: 'user' | 'interviewer'; content: string };
type Phase = 'interviewer_speaking' | 'processing' | 'candidate_turn';

const STALL_MS = 30_000; // Same stall budget as chat-panel.tsx.

export function LiveInterviewSession({
  sessionId,
  initialMessages,
  endSessionAction,
  caseTitle,
  problemStatement,
}: {
  sessionId: string;
  initialMessages: Msg[];
  endSessionAction: () => Promise<void> | void;
  /** Non-null only for case-based sessions — gates both the problem-statement
   *  panel and the issue tree. Behavioral/caseless sessions get neither. */
  caseTitle?: string | null;
  problemStatement?: string | null;
}) {
  const hasCase = Boolean(problemStatement);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  // Lazy initializer computes the correct starting phase synchronously at
  // mount — the effect below only needs to KICK OFF the async TTS fetch for
  // the opener, never to setState synchronously itself (that's what an
  // eslint react-hooks rule correctly flags: setState in the synchronous
  // body of an effect risks cascading renders).
  const [phase, setPhase] = useState<Phase>(() => {
    const last = initialMessages[initialMessages.length - 1];
    return last && last.role === 'interviewer' ? 'interviewer_speaking' : 'candidate_turn';
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [sttFallbackActive, setSttFallbackActive] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus>('loading');
  // Bumped once per completed turn — same trigger contract IssueTreePanel
  // already expects from solve-layout.tsx (refreshTrigger===0 means "just
  // fetch the existing tree," any increment means "re-extract").
  const [treeRefresh, setTreeRefresh] = useState(0);
  // Live caption — "what did it just hear me say," distinct from the full
  // toggle-able transcript below. Sourced directly from LiveMicInput's
  // onAutoSend callback (which already has the text), no new fetch.
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  // Real signal from /api/voice/transcribe's Whisper confidence data (see
  // that route + turn-detector.ts's onAutoSend threading) — surfaced on the
  // caption itself, distinct from the AI's own conversational judgment of
  // whether an answer made sense (that's a separate, LLM-side check).
  const [lastTranscriptLowConfidence, setLastTranscriptLowConfidence] = useState(false);
  // Written at ~30Hz by LiveMicInput's onAmplitude — read directly inside
  // the 3D scene's useFrame loop, never through React state (see
  // live-interview-scene.tsx's header comment for why).
  const ampRef = useRef(0);
  // Real elapsed session time (not a fabricated stat) for the chronometer
  // readout — ticks once/sec from actual mount time.
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedOpenerRef = useRef(false);
  // Lazily-created, reused across every turn (constructing a fresh
  // AudioContext per turn is wasteful and most browsers cap how many can
  // exist at once).
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Drives ampRef while the INTERVIEWER is speaking — either from a real
  // AnalyserNode tapped onto the server-TTS <audio> element, or (browser
  // speechSynthesis has no accessible audio buffer at all) a synthetic
  // talking pulse. Only one of these two drivers is ever active at a time;
  // both write into the same ampRef the 3D scene already reads, and both
  // are cancelled the same way via stopInterviewerAmplitude().
  const ampRafRef = useRef<number | null>(null);
  // The live analyser chain for the CURRENT interviewer turn — kept so
  // stopInterviewerAmplitude() can disconnect it. Without this, every turn
  // added another source→analyser→destination chain to the shared
  // AudioContext graph that never went away (no audio cost once its
  // element finished, but the graph grew every turn of a long session).
  const ampNodesRef = useRef<{ source: MediaElementAudioSourceNode; analyser: AnalyserNode } | null>(null);
  // Mirrors `phase` for use inside onAmplitude below — that callback is
  // captured ONCE inside LiveMicInput's own mount-time effect (empty deps),
  // so a plain closure over `phase` would go stale forever; reading a ref's
  // .current on each frame does not, since the ref itself is the same
  // mutable object regardless of which render captured the closure. Same
  // pattern LiveMicInput uses internally for its own phase prop.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Background reacts to voice through MOTION, not color: a smoothed
  // 0..1 amplitude is written to the shell as --hud-amp each frame, and
  // the corner contour waves + ambient glow scale with it in pure CSS
  // transforms (GPU-composited; the only main-thread cost is one style
  // write per frame on one element).
  const shellRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf: number;
    let smoothed = 0;
    const tick = () => {
      const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));
      smoothed += (amp - smoothed) * 0.07;
      shellRef.current?.style.setProperty('--hud-amp', smoothed.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getAudioCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const stopInterviewerAmplitude = () => {
    if (ampRafRef.current !== null) {
      cancelAnimationFrame(ampRafRef.current);
      ampRafRef.current = null;
    }
    if (ampNodesRef.current) {
      try {
        ampNodesRef.current.source.disconnect();
        ampNodesRef.current.analyser.disconnect();
      } catch {
        // Already disconnected — nothing to clean.
      }
      ampNodesRef.current = null;
    }
    ampRef.current = 0;
  };

  // Real amplitude: an AnalyserNode tapped onto the server-TTS <audio>
  // element. Fails open (blob just stays static that turn, playback is
  // completely unaffected) if AudioContext/AnalyserNode construction throws
  // — never blocks the actual interviewer audio, which is the only thing
  // that matters.
  const startAudioElementAmplitude = (audio: HTMLAudioElement) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      // Tear down the previous turn's chain (raf + graph nodes) before
      // building this one — turns can overlap on rapid barge-in + reply.
      stopInterviewerAmplitude();
      if (ctx.state === 'suspended') void ctx.resume();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      // Must route through to destination — an AnalyserNode is a pass-
      // through tap, not an endpoint; skipping this connect() would tap
      // the signal but silence actual playback.
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ampNodesRef.current = { source, analyser };
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        ampRef.current = Math.min(1, rms * 4.5); // speech RMS is typically small; scale up to use the same 0..1 range the mic path does
        ampRafRef.current = requestAnimationFrame(tick);
      };
      ampRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[live-interview] amplitude analyser unavailable, blob stays static this turn', err);
    }
  };

  // Synthetic fallback for browser speechSynthesis — no browser exposes a
  // readable audio buffer for that API, so there's no real amplitude to
  // read. A time-based pseudo-wobble at least animates the blob while Ash
  // talks instead of leaving it static, which was the actual complaint.
  const startSyntheticTalkingAmplitude = () => {
    const startedAt = performance.now();
    const tick = () => {
      const t = (performance.now() - startedAt) / 1000;
      ampRef.current =
        0.3 + 0.25 * Math.abs(Math.sin(t * 8.5)) + 0.15 * Math.abs(Math.sin(t * 13.7 + 1));
      ampRafRef.current = requestAnimationFrame(tick);
    };
    ampRafRef.current = requestAnimationFrame(tick);
  };
  // Cache of the browser's installed voices. getVoices() returns [] until the
  // async 'voiceschanged' event fires on most browsers, so we populate this
  // once in an effect below rather than reading it at speak-time.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Pick the most natural-sounding installed voice instead of the browser
  // default (the default is usually the most robotic option). The
  // "Natural"/"Neural" named voices (Microsoft's on Windows, Google's on
  // Chrome) are dramatically better and cost nothing. Prefers Indian English
  // first (fits this user), then US/GB, then any English, then whatever's
  // there. Returns null if no voices are loaded yet, in which case the
  // browser just uses its own default — still audible, never silent.
  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices || voices.length === 0) return null;
    const en = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    const pool = en.length ? en : voices;
    const score = (v: SpeechSynthesisVoice): number => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      let s = 0;
      if (name.includes('natural') || name.includes('neural')) s += 100;
      if (name.includes('google')) s += 40;
      if (lang.startsWith('en-in')) s += 8;
      else if (lang.startsWith('en-us')) s += 6;
      else if (lang.startsWith('en-gb')) s += 5;
      return s;
    };
    return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
  };

  // Voice-out ladder: Google TTS (server, best voice, needs a key) → browser
  // speechSynthesis (no key, no cost, works instantly, quality varies by
  // device) → silent text (last resort). So there is ALWAYS audio available
  // with zero setup, and the premium voice is a pure upgrade once the key is
  // set. Returns true if browser speech actually started, false if it's
  // unavailable (SSR, unsupported browser, or a synth error) so the caller
  // can fall through to text-only.
  const speakInBrowser = (text: string): boolean => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel(); // clear anything still queued
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickBestVoice();
      if (voice) utter.voice = voice;
      utter.rate = 1;
      utter.onstart = () => startSyntheticTalkingAmplitude();
      utter.onend = () => {
        stopInterviewerAmplitude();
        setPhase('candidate_turn');
      };
      utter.onerror = () => {
        stopInterviewerAmplitude();
        setPhase('candidate_turn');
      };
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  };

  // Callers are responsible for setting phase to 'interviewer_speaking'
  // BEFORE invoking this (either via the mount effect's lazy initial state,
  // or synchronously in sendTurn's own non-effect code path) — this function
  // only sets phase again once the async work resolves.
  const playInterviewerTurn = async (text: string) => {
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        // Server TTS (Google) not configured or failed — drop to the browser
        // voice before going silent. Only text-only if even that is
        // unavailable.
        if (!speakInBrowser(text)) setPhase('candidate_turn');
        return;
      }
      const { audioBase64, mimeType } = (await res.json()) as { audioBase64: string; mimeType: string };
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        stopInterviewerAmplitude();
        setPhase('candidate_turn');
      };
      audio.onerror = () => {
        stopInterviewerAmplitude();
        if (!speakInBrowser(text)) setPhase('candidate_turn');
      };
      startAudioElementAmplitude(audio);
      await audio.play().catch(() => {
        // Autoplay blocked or decode failure — try the browser voice instead.
        stopInterviewerAmplitude();
        if (!speakInBrowser(text)) setPhase('candidate_turn');
      });
    } catch (err) {
      console.warn('[live-interview] server TTS unavailable, trying browser voice', err);
      if (!speakInBrowser(text)) setPhase('candidate_turn');
    }
  };

  // Play the opener (already seeded server-side) on first mount. Phase is
  // already correct via the lazy useState initializer above. The actual
  // kick-off is deferred via queueMicrotask rather than called directly in
  // the effect body — playInterviewerTurn eventually calls setPhase, and the
  // react-hooks linter flags any setState-containing function invoked
  // synchronously from an effect body regardless of await position; a
  // microtask hop breaks that direct call chain without changing behavior
  // (this still runs before the next paint).
  useEffect(() => {
    if (startedOpenerRef.current) return;
    startedOpenerRef.current = true;
    const last = initialMessages[initialMessages.length - 1];
    if (last && last.role === 'interviewer') {
      queueMicrotask(() => void playInterviewerTurn(last.content));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any audio (both the <audio> element and browser speech) if the user
  // navigates away mid-sentence — otherwise speechSynthesis keeps talking
  // after the page is gone.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (ampRafRef.current !== null) cancelAnimationFrame(ampRafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Populate the installed-voices cache. getVoices() is often empty on the
  // first synchronous call; the 'voiceschanged' event fires once the browser
  // has loaded them. Sets a ref only (no state), so this can't trigger a
  // render cascade.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const interrupt = () => {
    audioRef.current?.pause();
    // Also cancel a browser-spoken turn — otherwise Stop wouldn't silence
    // audio coming from speechSynthesis rather than the <audio> element.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopInterviewerAmplitude();
    setPhase('candidate_turn');
  };

  const sendTurn = async (text: string, lowConfidence?: boolean) => {
    setNotice(null);
    setSttFallbackActive(false);
    setPhase('processing');
    setLastTranscript(text);
    setLastTranscriptLowConfidence(Boolean(lowConfidence));
    setMessages((m) => [...m, { role: 'user', content: text }]);

    const clientTurnId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const controller = new AbortController();
    const stallTimer = setTimeout(() => controller.abort(), STALL_MS);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userTurn: text, clientTurnId, lowConfidence: Boolean(lowConfidence) }),
        signal: controller.signal,
      });
      clearTimeout(stallTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        setNotice((data?.message as string) || 'Something went wrong — try again in a moment.');
        setPhase('candidate_turn');
        return;
      }

      const interviewerText = (await res.text()).trim();
      if (!interviewerText) {
        setNotice('No response — try again.');
        setPhase('candidate_turn');
        return;
      }
      setMessages((m) => [...m, { role: 'interviewer', content: interviewerText }]);
      setPhase('interviewer_speaking');
      void playInterviewerTurn(interviewerText);
      // Same trigger point chat-panel.tsx uses (onTurnComplete, right after
      // the interviewer's reply lands) — mirrors solve-layout.tsx's pattern
      // exactly. Case-only: a tree makes no sense for a behavioral session.
      if (hasCase) setTreeRefresh((n) => n + 1);
    } catch (err) {
      clearTimeout(stallTimer);
      console.error('[live-interview] chat call failed', err);
      // Known residual: a genuine network failure here, followed by the
      // candidate simply speaking again, generates a new clientTurnId and
      // isn't deduped against a prior successful-but-unacknowledged save —
      // same narrow, documented residual as chat-panel.tsx's own retry path.
      setNotice('That took too long — try again.');
      setPhase('candidate_turn');
    }
  };

  const showSubmitCta = phase === 'candidate_turn' && messages.length >= 6;

  // listenerStatus === 'transcribing' MUST be checked before `phase`
  // fallback — the gap between "candidate stopped talking" and "phase
  // actually flips to processing" (which only happens once the Whisper call
  // resolves and sendTurn() runs) was previously falling through to
  // 'LISTENING', i.e. the UI looked frozen for the whole STT round-trip
  // right when it matters most for perceived responsiveness.
  const stateLabel =
    phase === 'interviewer_speaking'
      ? 'INTERVIEWER — SPEAKING'
      : phase === 'processing'
        ? 'PROCESSING'
        : listenerStatus === 'transcribing'
          ? 'PROCESSING'
          : listenerStatus === 'speaking'
            ? 'HEARING YOU'
            : sttFallbackActive
              ? 'TYPE YOUR ANSWER'
              : 'LISTENING';

  // Drives the 3D scene's mood color — see live-interview-scene.tsx and the
  // .hud-glow-* rules in the trailing <style jsx> block. Distinct from
  // `phase` alone because "candidate is actively speaking"
  // (listenerStatus === 'speaking') should read differently from
  // "candidate_turn but silent, waiting," and transcribing should read as
  // "processing" for the same reason as stateLabel above.
  const glowState: GlowState = notice
    ? 'error'
    : phase === 'interviewer_speaking'
      ? 'ai'
      : phase === 'processing' || listenerStatus === 'transcribing'
        ? 'processing'
        : listenerStatus === 'speaking'
          ? 'candidate'
          : 'idle';

  const elapsedLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  return (
    <main ref={shellRef} className={`hud-shell hud-glow-${glowState} min-h-screen flex flex-col`}>
      <div className="hud-mood-glow" aria-hidden="true" />
      <div className="hud-scene" aria-hidden="true">
        <LiveInterviewScene glowState={glowState} ampRef={ampRef} />
      </div>
      <div className="hud-contour hud-contour-tr" aria-hidden="true" />
      <div className="hud-contour hud-contour-bl" aria-hidden="true" />
      <div className="hud-vignette" aria-hidden="true" />

      <section className="hud-header px-6 sm:px-12 py-6 flex items-center justify-between flex-wrap gap-3">
        <span className="hud-eyebrow">{'// LIVE_INTERVIEW'}</span>
        <button type="button" onClick={() => setTranscriptOpen((v) => !v)} className="hud-eyebrow hud-link">
          {transcriptOpen ? '[ HIDE TRANSCRIPT ]' : '[ SHOW TRANSCRIPT ]'}
        </button>
      </section>

      <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 px-4 sm:px-8 py-8 lg:py-12">
        {hasCase && (
          <aside className="hud-side-panel">
            <div className="hud-panel-label">
              PROBLEM STATEMENT{caseTitle ? ` — ${caseTitle.toUpperCase()}` : ''}
            </div>
            <div className="hud-panel-body">{problemStatement}</div>
          </aside>
        )}

        <div className="flex flex-col items-center justify-center gap-5 flex-1 min-w-0">
        {/* Pure layout spacer reserving the vertical space where the 3D blob
            visually renders — the scene itself is a full-bleed absolutely-
            positioned canvas behind everything, per hud-scene above. */}
        <div className="blob-frame" aria-hidden="true">
          <BlobFace glowState={glowState} ampRef={ampRef} />
        </div>

        <div className="blob-meta">
          <span className="blob-dot" aria-hidden="true" />
          ASH · LIVE · SESSION {elapsedLabel} · TURN {Math.ceil(messages.length / 2)}
        </div>

        <span className="hud-readout" aria-live="polite">
          [ {stateLabel} ]
        </span>

        {phase === 'interviewer_speaking' && listenerStatus !== 'needs_permission' && listenerStatus !== 'loading' && (
          <button type="button" onClick={interrupt} className="hud-link-button">
            ⏻ Jump in
          </button>
        )}

        {!sttFallbackActive && (
          <LiveMicInput
            sessionId={sessionId}
            phase={phase}
            onAutoSend={(text, lowConfidence) => void sendTurn(text, lowConfidence)}
            onBargeIn={interrupt}
            onSttFailed={() => setSttFallbackActive(true)}
            onStatusChange={setListenerStatus}
            onAmplitude={(level) => {
              // Suppressed while the interviewer is talking — that phase has
              // its own amplitude driver (real analyser or synthetic pulse,
              // see startAudioElementAmplitude/startSyntheticTalkingAmplitude
              // above) and letting the candidate's ambient mic level fight
              // it every VAD frame would make the blob flicker between the
              // two. phaseRef, not the closed-over `phase`, because this
              // callback is captured once inside LiveMicInput's own
              // mount-time effect and would otherwise go stale.
              if (phaseRef.current !== 'interviewer_speaking') {
                ampRef.current = level;
              }
            }}
          />
        )}
        <span className="hud-mic-note">Mic input degrades gracefully — never blocks a turn.</span>

        {/* Live caption — confirms what was just heard, separate from the
            [SHOW TRANSCRIPT] full-history toggle above. Sourced directly
            from the text sendTurn() already receives, no new fetch. */}
        {lastTranscript && (
          <div className={lastTranscriptLowConfidence ? 'hud-caption hud-caption-unclear' : 'hud-caption'} aria-live="polite">
            <span className="hud-caption-label">YOU SAID</span> {lastTranscript}
            {lastTranscriptLowConfidence && (
              <span className="hud-caption-flag"> — that came through unclear, worth confirming</span>
            )}
          </div>
        )}

        {sttFallbackActive && phase === 'candidate_turn' && (
          <form
            className="flex gap-2 w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const t = fallbackText.trim();
              if (t) {
                setFallbackText('');
                void sendTurn(t);
              }
            }}
          >
            <input
              autoFocus
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Type your answer for this turn…"
              className="hud-input flex-1 px-3 py-2"
            />
            <button type="submit" className="hud-link-button">
              SEND
            </button>
          </form>
        )}

        {notice && (
          <p role="alert" className="hud-notice text-sm text-center max-w-md">
            {notice}
          </p>
        )}
        </div>

        {hasCase && (
          <aside className="hud-side-panel hud-tree-side-panel">
            <div className="hud-panel-label">ISSUE TREE</div>
            {/* IssueTreePanel is styled for the light HUPR theme (built for
                /solve) — wrapped in this dark glass panel rather than
                reskinning its internals (drag-reparent UI, node cards,
                etc.), a bigger job scoped out unless it reads as actually
                broken rather than just stylistically inconsistent. */}
            <div className="hud-tree-embed">
              <IssueTreePanel sessionId={sessionId} refreshTrigger={treeRefresh} />
            </div>
          </aside>
        )}
      </div>

      {transcriptOpen && (
        <section className="hud-transcript px-6 sm:px-12 py-6 max-h-[40vh] overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className="hud-transcript-line">
                <span className="hud-eyebrow mr-2">{m.role === 'interviewer' ? 'ASH' : 'YOU'}</span>
                {m.content}
              </div>
            ))}
          </div>
        </section>
      )}

      {showSubmitCta && (
        <InlineSubmitCTA sessionId={sessionId} endSessionAction={endSessionAction} messageCount={messages.length} />
      )}

      <style jsx>{`
        /* ---- Restrained "reactive AI blob" treatment ------------------
           One hero object (the 3D scene, full-bleed behind everything),
           near-black backdrop, minimal unobtrusive text — no boxed HUD
           panels, no rings/ticks/arcs, no hex-grid or scanline texture.
           Two prior busier structural attempts here were both rejected;
           this follows a reference the user pointed to directly. */
        .hud-shell {
          position: relative;
          background: #030304;
          color: #eef0f4;
          overflow: hidden;
          isolation: isolate;
        }
        .hud-scene {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        /* Soft mood glow bleeding out from behind the blob — follows the
           per-state accent color, breathes on a slow CSS animation (GPU
           compositor only, no JS — the page just took a perf pass, so the
           background layers are deliberately zero-main-thread). Sits UNDER
           the 3D canvas in the DOM so the blob renders over it. */
        .hud-mood-glow {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(
            circle at 50% 42%,
            color-mix(in srgb, var(--jarvis-glow, #38bdf8) 7%, transparent),
            transparent 52%
          );
          animation: hud-glow-breathe 5s ease-in-out infinite;
          transition: background 600ms ease;
          /* Swells gently with live voice amplitude — motion, not color. */
          transform: scale(calc(1 + var(--hud-amp, 0) * 0.06));
          transform-origin: 50% 42%;
        }
        @keyframes hud-glow-breathe {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        /* Fine concentric contour waves radiating from two corners — the
           signature background texture in the design reference this screen
           is built toward. Static inline SVG, near-invisible on their own,
           just enough to keep the black from reading as dead space. */
        .hud-contour {
          position: absolute;
          z-index: 1;
          width: 420px;
          height: 420px;
          pointer-events: none;
          opacity: 0.07;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'%3E%3Cg fill='none' stroke='%23eef0f4' stroke-width='1'%3E%3Ccircle cx='420' cy='0' r='70'/%3E%3Ccircle cx='420' cy='0' r='115'/%3E%3Ccircle cx='420' cy='0' r='165'/%3E%3Ccircle cx='420' cy='0' r='220'/%3E%3Ccircle cx='420' cy='0' r='280'/%3E%3Ccircle cx='420' cy='0' r='345'/%3E%3Ccircle cx='420' cy='0' r='415'/%3E%3C/g%3E%3C/svg%3E");
          background-repeat: no-repeat;
        }
        /* The waves expand outward from their corner with voice amplitude —
           sound pressure reaching the walls of the room. */
        .hud-contour-tr {
          top: 0;
          right: 0;
          transform-origin: top right;
          transform: scale(calc(1 + var(--hud-amp, 0) * 0.1));
        }
        .hud-contour-bl {
          bottom: 0;
          left: 0;
          transform-origin: bottom left;
          transform: rotate(180deg) scale(calc(1 + var(--hud-amp, 0) * 0.1));
        }
        @media (prefers-reduced-motion: reduce) {
          .hud-mood-glow { animation: none; }
        }
        .hud-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background: radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(3, 3, 4, 0.6) 82%, #030304 100%);
        }
        .hud-header,
        .hud-shell > .flex-1 {
          position: relative;
          z-index: 2;
        }
        .hud-header {
          border-bottom: 1px solid rgba(238, 240, 244, 0.1);
        }
        .hud-eyebrow {
          font-family: var(--font-headline);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: rgba(238, 240, 244, 0.5);
        }
        .hud-link {
          background: none;
          border: 0;
          cursor: pointer;
        }
        .hud-link:hover {
          color: var(--jarvis-glow, #7dd8ff);
        }

        /* ---- Blob stage -------------------------------------------------
           Pure spacer reserving the vertical space where the full-bleed 3D
           scene's hero object visually sits — no border, no background,
           just a host for the opt-in avatar overlay. */
        .blob-frame {
          position: relative;
          width: clamp(200px, 26vw, 280px);
          height: clamp(200px, 26vw, 280px);
        }
        .blob-meta {
          font-family: var(--font-headline);
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.02em;
          color: rgba(238, 240, 244, 0.55);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .blob-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--jarvis-glow, #38bdf8);
          box-shadow: 0 0 6px var(--jarvis-glow, #38bdf8);
        }

        .hud-readout {
          font-family: var(--font-headline);
          font-weight: 500;
          font-size: 14px;
          letter-spacing: 0.02em;
          color: #d7dce6;
        }
        .hud-mic-note {
          font-family: var(--font-headline);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.01em;
          color: rgba(238, 240, 244, 0.35);
          text-align: center;
        }
        .hud-link-button {
          font-family: var(--font-headline);
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.01em;
          padding: 10px 20px;
          background: transparent;
          border: 1px solid rgba(238, 240, 244, 0.28);
          border-radius: 999px;
          color: #eef0f4;
          cursor: pointer;
        }
        .hud-link-button:hover {
          border-color: var(--jarvis-glow, #9be7ff);
          color: var(--jarvis-glow, #9be7ff);
        }
        .hud-input {
          font-family: var(--font-headline);
          font-weight: 500;
          font-size: 14px;
          background: rgba(238, 240, 244, 0.05);
          border: 1px solid rgba(238, 240, 244, 0.2);
          border-radius: 10px;
          color: #eef0f4;
          outline: none;
        }
        .hud-input::placeholder {
          color: rgba(238, 240, 244, 0.35);
        }
        .hud-notice {
          color: #ff8a8a;
          font-family: var(--font-headline);
          font-weight: 500;
          font-size: 13px;
        }
        .hud-transcript {
          border-top: 1px solid rgba(238, 240, 244, 0.14);
        }
        .hud-transcript-line {
          font-family: var(--font-accent);
          font-size: 14px;
          color: rgba(238, 240, 244, 0.85);
        }

        /* ---- Side panels (problem statement + issue tree) -------------- */
        .hud-side-panel {
          width: 100%;
          max-width: 420px;
          flex-shrink: 0;
          background: rgba(238, 240, 244, 0.04);
          border: 1px solid rgba(238, 240, 244, 0.14);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 70vh;
          overflow-y: auto;
        }
        @media (min-width: 1024px) {
          .hud-side-panel {
            max-width: 300px;
          }
        }
        .hud-panel-label {
          font-family: var(--font-headline);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.02em;
          color: var(--jarvis-glow, #9be7ff);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(238, 240, 244, 0.12);
          padding-bottom: 8px;
        }
        .hud-panel-body {
          font-family: var(--font-accent);
          font-size: 14px;
          line-height: 1.6;
          color: rgba(238, 240, 244, 0.9);
          white-space: pre-wrap;
        }
        /* IssueTreePanel is built for the light HUPR theme — this wrapper
           gives it a legible light surface to sit on rather than fighting
           the dark HUD background, without touching its internals. */
        .hud-tree-embed {
          background: rgba(244, 244, 244, 0.94);
          border-radius: 4px;
          padding: 8px;
          color: #323234;
        }

        /* ---- Live caption strip ----------------------------------------- */
        .hud-caption {
          font-family: var(--font-accent);
          font-size: 13px;
          line-height: 1.5;
          color: rgba(238, 240, 244, 0.75);
          text-align: center;
          max-width: 480px;
          padding: 10px 18px;
          background: rgba(238, 240, 244, 0.04);
          border: 1px solid rgba(238, 240, 244, 0.1);
          border-radius: 12px;
        }
        .hud-caption-label {
          font-family: var(--font-headline);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.02em;
          color: var(--jarvis-glow, #9be7ff);
        }
        /* Real signal (Whisper confidence), not decorative — reuses the same
           red used for the 'error' glow state elsewhere in this file. */
        .hud-caption-unclear {
          border-color: rgba(255, 77, 77, 0.4);
        }
        .hud-caption-flag {
          color: #ff8a8a;
          font-style: italic;
        }

        /* Isolated-per-state accent color for the small bits of text/UI
           that still need one (mode-button active state, panel labels,
           the status dot) — the 3D blob itself carries the real multi-hue
           "personality" via its own light trio, this is just a matching
           single-hex accent for flat 2D chrome. */
        .hud-glow-ai { --jarvis-glow: #f59e0b; }
        .hud-glow-candidate { --jarvis-glow: #4ade80; }
        .hud-glow-processing { --jarvis-glow: #8b5cf6; }
        .hud-glow-idle { --jarvis-glow: #38bdf8; }
        .hud-glow-error { --jarvis-glow: #ef4444; }
        .hud-glow-candidate .hud-readout { color: #86efac; }
        .hud-glow-error .hud-readout { color: #ff8a8a; }
      `}</style>
    </main>
  );
}
