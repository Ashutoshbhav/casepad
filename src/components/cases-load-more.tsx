'use client';

import { useState, type ReactNode } from 'react';

// CasesLoadMore — client-side progressive disclosure for the library list.
// Server hands us all already-fetched rows (capped at 60 by the page query)
// pre-rendered as <CaseListRowItem> children. We hold a visible count in
// state, render the first N children, and reveal 30 more per click. No
// round-trip; the full payload was already shipped.
//
// totalLibrarySize is the global library count (e.g. 1,165) — used only for
// the "Showing X of 1,165" counter copy. The displayed rows are bounded by
// `children.length`, not by totalLibrarySize.

const INITIAL_VISIBLE = 30;
const STEP = 30;

export function CasesLoadMore({
  children,
  totalLibrarySize,
}: {
  children: ReactNode[];
  totalLibrarySize: number;
}) {
  const total = children.length;
  const [visible, setVisible] = useState(Math.min(INITIAL_VISIBLE, total));

  const remaining = total - visible;
  const hasMore = remaining > 0;
  // If fewer than 2 steps' worth remain, switch to "Show all" copy so the
  // last click feels final.
  const buttonLabel =
    remaining > 0 && remaining <= STEP
      ? `Show all ${total} →`
      : `Show ${Math.min(STEP, remaining)} more`;

  return (
    <>
      <div>{children.slice(0, visible)}</div>

      {(hasMore || total > 0) && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisible((v) => Math.min(v + STEP, total))}
              className="px-5 py-2 text-xs font-medium tracking-wide transition-opacity hover:opacity-80"
              style={{
                background: 'transparent',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
                borderRadius: '2px',
              }}
            >
              {buttonLabel}
            </button>
          )}
          <span className="meta-label">
            Showing {visible} of {totalLibrarySize.toLocaleString()}
          </span>
        </div>
      )}
    </>
  );
}
