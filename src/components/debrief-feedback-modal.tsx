'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING, EASE, DURATION } from '@/lib/motion-tokens';

// DebriefFeedbackModal — auto-trigger feedback prompt on /debrief.
//
// Opens 8s after mount unless the user has already given feedback this session
// (localStorage flag) or the server has confirmed a row exists for this session
// (initiallyDismissed prop). Skip == close == localStorage flag (no POST).
//
// Three sentiment buttons map to the API enum we POST:
//   useful     -> 'positive'
//   confusing  -> 'neutral'
//   boring     -> 'negative'
//
// Emoji is allowed HERE only because sentiment recognition is the entire
// shortcut. Don't propagate emoji to other surfaces.
//
// Esc + click-outside dismiss. Slide-up + backdrop fade via motion/react,
// matching SubmitConfirmationModal. Reduced-motion clients get an opacity-only
// fade. Mobile = full-width with safe-area padding. Body scroll locked while
// open. Focus trap inside the dialog. Toast auto-closes after 2s on success.

type Sentiment = 'useful' | 'confusing' | 'boring';

const SENTIMENT_API_VALUE: Record<Sentiment, 'positive' | 'neutral' | 'negative'> = {
  useful: 'positive',
  confusing: 'neutral',
  boring: 'negative',
};

const SENTIMENTS: Array<{ key: Sentiment; emoji: string; label: string }> = [
  { key: 'useful', emoji: '😊', label: 'useful' },
  { key: 'confusing', emoji: '🤔', label: 'confusing' },
  { key: 'boring', emoji: '😴', label: 'boring' },
];

type Props = {
  sessionId: string;
  initiallyDismissed?: boolean;
};

export function DebriefFeedbackModal({ sessionId, initiallyDismissed = false }: Props) {
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false); // localStorage / server gate cleared
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const storageKey = `feedback_seen_${sessionId}`;

  // Mount gate: localStorage + server prop.
  useEffect(() => {
    if (initiallyDismissed) return;
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      // localStorage may be unavailable (private mode); fall through and arm.
    }
    setArmed(true);
  }, [initiallyDismissed, storageKey]);

  // 8-second timer fires once the gates are clear.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(t);
  }, [armed]);

  // Esc + body scroll-lock + focus trap + initial focus.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog after the slide-up has had a beat. We focus
    // the headline so screen readers announce the prompt, not a button label.
    const t = setTimeout(() => {
      headlineRef.current?.focus();
    }, 120);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setSeenFlag() {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore — storage may be unavailable; server-side check is the backstop
    }
  }

  function handleSkip() {
    setSeenFlag();
    setOpen(false);
  }

  async function handleSubmit() {
    if (!sentiment || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // The existing /api/session-feedback handler expects camelCase keys
      // (sessionId, sentiment, freeText). We map our internal sentiment names
      // to the canonical positive/neutral/negative trio per spec.
      const res = await fetch('/api/session-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sentiment: SENTIMENT_API_VALUE[sentiment],
          freeText: freeText.trim() ? freeText.trim() : null,
        }),
      });
      if (!res.ok) throw new Error('non-2xx');
      setSeenFlag();
      setShowToast(true);
      setOpen(false);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      setError("couldn't send — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="feedback-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.micro, ease: EASE.expo }}
              onClick={handleSkip}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 70,
              }}
              aria-hidden="true"
            />
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 71,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding:
                  'max(env(safe-area-inset-top, 0px), 16px) 16px max(env(safe-area-inset-bottom, 0px), 16px)',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                key="feedback-dialog"
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-modal-headline"
                aria-describedby="feedback-modal-desc"
                initial={reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: 16 }}
                transition={
                  reduced
                    ? { duration: DURATION.micro, ease: EASE.expo }
                    : SPRING.modal
                }
                style={{
                  width: 'min(440px, 100%)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  pointerEvents: 'auto',
                  willChange: 'transform, opacity',
                  position: 'relative',
                }}
              >
                {/* Skip — top-right, mono, low-key. Treated as Esc / click-outside. */}
                <button
                  type="button"
                  onClick={handleSkip}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] hover:opacity-80 transition-opacity"
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 16,
                    color: 'var(--color-text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  aria-label="skip this feedback prompt"
                >
                  skip
                </button>

                <div className="px-6 pt-7 pb-2">
                  <h2
                    id="feedback-modal-headline"
                    ref={headlineRef}
                    tabIndex={-1}
                    className="font-headline uppercase leading-tight outline-none"
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    One word. Was this useful?
                  </h2>
                  <p id="feedback-modal-desc" className="sr-only">
                    Pick a sentiment, optionally add a one-line note, and send.
                  </p>
                </div>

                {/* Sentiment row */}
                <div className="px-6 pt-3 pb-1 flex gap-2 flex-wrap">
                  {SENTIMENTS.map((s) => (
                    <SentimentButton
                      key={s.key}
                      emoji={s.emoji}
                      label={s.label}
                      selected={sentiment === s.key}
                      onClick={() => setSentiment(s.key)}
                    />
                  ))}
                </div>

                {/* Optional free text */}
                <div className="px-6 pt-4">
                  <textarea
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="Anything specific?"
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded p-2 text-sm focus:outline-none transition-colors"
                    style={{
                      background: 'rgba(0,0,0,0.18)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Inline error */}
                {error && (
                  <div
                    className="meta-label px-6 pt-2"
                    style={{ color: '#e58c6f' }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* Send — coral filled, only once a sentiment is picked */}
                <div className="px-6 pt-4 pb-6 flex justify-end">
                  {sentiment && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{
                        background: 'var(--color-accent)',
                        color: 'var(--color-accent-fg)',
                      }}
                    >
                      {submitting ? 'Sending…' : 'Send'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Toast — mono caps, brief. Appears after the modal closes on success. */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            key="feedback-toast"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={
              reduced
                ? { duration: DURATION.micro, ease: EASE.expo }
                : SPRING.micro
            }
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 72,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
            }}
          >
            <span
              className="meta-label"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Got it. Thanks.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// SentimentButton — internal. Emoji + label, toggles selected state via the
// parent's setter. We avoid a one-button-per-emoji file by keeping this private
// to the modal; nothing else in the app needs an emoji button.
function SentimentButton({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all hover:opacity-90"
      style={{
        background: selected
          ? 'var(--color-accent)'
          : 'rgba(0,0,0,0.18)',
        border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        color: selected
          ? 'var(--color-accent-fg)'
          : 'var(--color-text-secondary)',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">
        {emoji}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
        {label}
      </span>
    </button>
  );
}
