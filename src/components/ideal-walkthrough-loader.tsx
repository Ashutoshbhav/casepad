'use client';

// IdealWalkthroughLoader — renders the "ideal answer" walkthrough WITHOUT
// blocking the debrief page render. Shows the cached version instantly if we
// have one; if it's missing or stale (older generator), it fetches/regenerates
// via /api/walkthrough in the background and swaps in the fresh version.
//
// This is the fix for the 60-95s generation that used to run inside the page
// render and would time out on Vercel.

import { useEffect, useState } from 'react';
import type { IdealWalkthrough } from '@/lib/groq/walkthrough';
import { IdealWalkthroughView } from './ideal-walkthrough';

export function IdealWalkthroughLoader({
  sessionId,
  initial,
  initialFresh,
}: {
  sessionId: string;
  initial: IdealWalkthrough | null;
  initialFresh: boolean;
}) {
  const [w, setW] = useState<IdealWalkthrough | null>(initial);
  // Only fetch if we don't already have a fresh cached version.
  const [loading, setLoading] = useState(!initialFresh);

  useEffect(() => {
    if (initialFresh) return; // cached + current — nothing to do
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/walkthrough', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const j = await r.json().catch(() => ({}));
        if (!cancelled && j?.walkthrough) setW(j.walkthrough as IdealWalkthrough);
      } catch {
        /* fail-soft: keep whatever we had (stale or null) */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, initialFresh]);

  // Have a walkthrough to show (fresh, or stale-while-revalidating).
  if (w) {
    return (
      <div>
        {loading && (
          <div
            className="mb-3 text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
          >
            ↻ refreshing the ideal answer with the latest model…
          </div>
        )}
        <IdealWalkthroughView w={w} />
      </div>
    );
  }

  // Nothing cached yet — first-ever generation in flight.
  if (loading) {
    return (
      <div
        className="text-sm py-6"
        style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-text-muted)' }}
      >
        <span className="inline-flex items-center gap-2">
          <span className="animate-pulse">✦</span>
          Crafting the ideal answer for this case… (this takes a few seconds)
        </span>
      </div>
    );
  }

  // Generation failed and nothing cached — soft, non-blocking message.
  return (
    <div className="text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>
      The ideal answer couldn&apos;t be generated right now. Refresh in a moment to try again.
    </div>
  );
}
