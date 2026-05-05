'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING, EASE, DURATION } from '@/lib/motion-tokens';

// SheetDrawer — generic right-side slide-out drawer.
// Width: 380px on desktop, 100% on tablet/mobile.
// Slide in from right (translateX 100% → 0) over 240ms ease-out, with a
// fading backdrop. Esc / backdrop-click closes. Body scroll-locked while
// open. Keyboard focus trapped within the drawer when open.
// Honors useReducedMotion() — under reduced motion the drawer fades only.

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function SheetDrawer({ open, onClose, title, children }: Props) {
  const reduced = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Esc to close + body scroll lock + focus trap.
  // Scroll-lock engages SYNCHRONOUSLY before the drawer animates so the
  // body never jitters while the drawer slides in. Focus is only moved
  // into the drawer once the slide-in has had a beat to land (200ms),
  // otherwise the focus-ring jumps mid-animation and reads as jank.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the drawer AFTER the slide settles.
    const t = setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 200);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        // Simple focus trap.
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
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

  return (
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
              background: 'rgba(0,0,0,0.4)',
              zIndex: 60,
            }}
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Drawer'}
            initial={
              reduced ? { opacity: 0, x: 0 } : { opacity: 1, x: '100%' }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduced ? { opacity: 0, x: 0 } : { opacity: 1, x: '100%' }
            }
            transition={
              reduced
                ? { duration: DURATION.micro, ease: EASE.expo }
                : SPRING.modal
            }
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: 'min(380px, 100%)',
              background: 'var(--color-bg-elevated)',
              borderLeft: '1px solid var(--color-border)',
              zIndex: 61,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
              willChange: 'transform',
            }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {title ?? ''}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="font-mono text-[12px] px-2 py-1 rounded transition-opacity hover:opacity-70"
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
