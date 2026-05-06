'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { SubmitConfirmationModal } from './submit-confirmation-modal';

// SubmitForScoringButton — primary "submit for scoring" CTA.
//
// Used by both the toolbar (top-right of /solve) and the inline CTA at the
// bottom of the chat panel. Wraps the form + state for the confirmation
// modal so a single source of truth governs the submission flow.
//
// Variants:
//   toolbar — small filled coral pill, sits in the header next to "Cheat sheet"
//   inline  — slightly larger pill, lives inside InlineSubmitCTA
//
// When `ended` is true, both variants flip to "Already scored — see debrief →"
// and link to /debrief/[sessionId] instead of opening the confirm modal.

type Variant = 'toolbar' | 'inline';

type Props = {
  sessionId: string;
  endSessionAction: () => Promise<void> | void;
  variant: Variant;
  disabled?: boolean;
  disabledReason?: string;
  ended?: boolean;
};

export function SubmitForScoringButton({
  sessionId,
  endSessionAction,
  variant,
  disabled,
  disabledReason,
  ended,
}: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // useTransition lets us reflect "scoring…" while the server action runs
  // and disables the modal buttons so a double-click can't fire two evals.
  const [pending, startTransition] = useTransition();

  // Already-ended session — surface the debrief link instead of a re-submit.
  if (ended) {
    const ghostClass =
      variant === 'toolbar'
        ? 'ghost-btn ghost-btn--accent text-[12px] px-3 py-1.5 rounded'
        : 'ghost-btn ghost-btn--accent text-sm px-4 py-2 rounded-md';
    return (
      <Link
        href={`/debrief/${sessionId}`}
        className={ghostClass}
        data-tour={variant === 'toolbar' ? 'solve-end' : undefined}
      >
        Already scored — see debrief →
      </Link>
    );
  }

  const onClick = () => {
    if (disabled) return;
    setOpen(true);
  };

  const onConfirm = () => {
    startTransition(async () => {
      try {
        await endSessionAction();
      } catch {
        // The endSession action triggers a redirect on success which throws
        // a NEXT_REDIRECT internally — that's expected. If a real error
        // bubbles up the modal stays open and the user can retry.
      }
    });
  };

  const sharedClass =
    variant === 'toolbar'
      ? 'text-[12px] px-3.5 py-1.5 rounded-md font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
      : 'text-sm px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed';

  const label = variant === 'toolbar' ? 'Submit for scoring' : 'Submit for scoring →';

  return (
    <>
      <form
        ref={formRef}
        action={endSessionAction as any}
        data-tour={variant === 'toolbar' ? 'solve-end' : undefined}
        onSubmit={(e) => {
          // We never let the form natively submit — the modal is the
          // confirmation gate. The form is here only so the underlying
          // Next.js server action wiring is the same as before.
          e.preventDefault();
        }}
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || pending}
          title={disabled ? disabledReason : undefined}
          aria-disabled={disabled || pending}
          className={sharedClass}
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)',
          }}
        >
          {label}
        </button>
      </form>
      <SubmitConfirmationModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={onConfirm}
        pending={pending}
      />
    </>
  );
}
