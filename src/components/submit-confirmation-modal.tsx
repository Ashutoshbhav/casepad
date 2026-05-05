'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING, EASE, DURATION } from '@/lib/motion-tokens';

// SubmitConfirmationModal — "Submit for scoring?" confirm dialog.
//
// Esc + click-outside dismiss. Slide-up + backdrop fade via motion/react.
// Reduced-motion clients get an opacity-only fade. Mobile = full-width with
// safe-area padding. Body scroll locked while open. Focus moves to the
// "Yes" button on open and is trapped within the dialog while open.
//
// The actual submission is owned by the parent — this component fires the
// `onConfirm` callback when "Yes, score me" is clicked. The parent submits
// the existing endSession server action.

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
};

export function SubmitConfirmationModal({ open, onClose, onConfirm, pending }: Props) {
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Mounted flag — required because portals reach for `document.body` which
  // doesn't exist during SSR. Render nothing until after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Esc to close + body scroll-lock + focus trap. Mirrors the SheetDrawer
  // pattern so we have one consistent dialog feel across the app.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus to the primary CTA after the slide-up has had a beat.
    const t = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 120);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
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
  }, [open, onClose]);

  // Portal to document.body so a transformed ancestor (chat panel's
  // motion/react container) doesn't form a new containing block for
  // our `position: fixed` overlay — which previously squashed the modal
  // into a ~250px column on /solve. Portal sidesteps it cleanly.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.micro, ease: EASE.expo }}
            onClick={onClose}
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
              padding: 'max(env(safe-area-inset-top, 0px), 16px) 16px max(env(safe-area-inset-bottom, 0px), 16px)',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key="dialog"
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Submit for scoring"
              initial={
                reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: 24 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: 16 }
              }
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
              }}
            >
              <div className="px-6 pt-6 pb-2">
                <h2
                  className="font-headline text-2xl leading-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Submit for scoring?
                </h2>
              </div>
              <div
                className="px-6 py-3 text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                You&apos;ll get your dimensional rubric (MECE / depth / quant / synthesis) plus the ideal walkthrough. You won&apos;t be able to add more turns to this case after this — but you can always start fresh.
              </div>
              <div className="px-6 pt-3 pb-6 flex gap-2 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="ghost-btn text-sm px-4 py-2 rounded-md disabled:opacity-50"
                >
                  Not yet
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={onConfirm}
                  disabled={pending}
                  className="text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-accent-fg)',
                  }}
                >
                  {pending ? 'Scoring…' : 'Yes, score me'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
