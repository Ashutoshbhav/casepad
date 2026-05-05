'use client';

import { useEffect, useState } from 'react';
import { TREATMENTS, type TreatmentId } from '../_lib/tokens';

// Reads localStorage on mount + listens for design-choice:changed events fired
// by PickButton so the badge updates instantly without a reload.
export function CurrentPickBadge() {
  const [pick, setPick] = useState<TreatmentId | null>(null);
  const [pickedAt, setPickedAt] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      try {
        const v = window.localStorage.getItem(
          'design_choice',
        ) as TreatmentId | null;
        const at = window.localStorage.getItem('design_choice_at');
        setPick(v);
        setPickedAt(at);
      } catch {
        setPick(null);
        setPickedAt(null);
      }
    }
    refresh();
    window.addEventListener('design-choice:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('design-choice:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!pick) {
    return (
      <div className="text-xs text-zinc-500">
        No treatment picked yet. Open each link below, scroll, then pick the winner.
      </div>
    );
  }

  const treatment = TREATMENTS[pick];
  const when = pickedAt ? new Date(pickedAt).toLocaleString() : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-zinc-500">Currently picked:</span>
      <span className="rounded border border-amber-700/40 bg-amber-950/20 px-2 py-0.5 text-amber-300">
        {treatment?.name ?? pick}
      </span>
      {when && <span className="text-zinc-600">at {when}</span>}
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.removeItem('design_choice');
            window.localStorage.removeItem('design_choice_at');
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent('design-choice:changed'));
        }}
        className="text-zinc-500 underline hover:text-zinc-300"
      >
        clear
      </button>
    </div>
  );
}
