'use client';

import { useEffect, useState } from 'react';

// Lightweight tour overlay — no dependencies. Renders an absolute-positioned
// tooltip pointing at a target element by data-tour attribute. User can Skip
// to dismiss everything (sets localStorage casepad-tour-seen=1).
//
// Steps reference target by its data-tour="<id>" string. The overlay reads
// the target's bounding rect and positions itself near it. If target is
// missing (e.g., page changed), tour skips that step gracefully.

export interface TourStep {
  target: string;          // data-tour value
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function TourOverlay({ steps, storageKey = 'casepad-tour-seen' }: { steps: TourStep[]; storageKey?: string }) {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) setActive(true);
  }, [storageKey]);

  useEffect(() => {
    if (!active) return;
    const step = steps[stepIdx];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) {
      setStepIdx((i) => i + 1);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const r = el.getBoundingClientRect();
    setRect(r);
    el.style.outline = '2px solid #10b981';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = '4px';
    return () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    };
  }, [active, stepIdx, steps]);

  const finish = () => {
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, '1');
    setActive(false);
  };

  if (!active) return null;
  const step = steps[stepIdx];
  if (!step) { finish(); return null; }
  if (!rect) return null;

  // Place tooltip below the highlighted element by default; flip to above if no room.
  const TOOLTIP_W = 320;
  const placeBelow = rect.bottom + 180 < window.innerHeight;
  const top = placeBelow ? rect.bottom + 12 : Math.max(12, rect.top - 180);
  const left = Math.min(window.innerWidth - TOOLTIP_W - 12, Math.max(12, rect.left));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 pointer-events-none" />
      <div
        className="fixed z-50 rounded-lg border border-emerald-600 bg-zinc-950 shadow-2xl p-4 text-zinc-100"
        style={{ top: `${top}px`, left: `${left}px`, width: `${TOOLTIP_W}px` }}
      >
        <div className="text-xs uppercase text-emerald-300 mb-1">Tour · {stepIdx + 1} / {steps.length}</div>
        <div className="font-semibold text-sm mb-1">{step.title}</div>
        <p className="text-xs text-zinc-300 leading-relaxed">{step.body}</p>
        <div className="flex justify-between items-center mt-3">
          <button onClick={finish} className="text-xs text-zinc-500 hover:text-zinc-300">Skip tour</button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button onClick={() => setStepIdx((i) => i - 1)} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">← Back</button>
            )}
            {stepIdx < steps.length - 1 ? (
              <button onClick={() => setStepIdx((i) => i + 1)} className="text-xs px-3 py-1 rounded bg-emerald-600 text-white">Next →</button>
            ) : (
              <button onClick={finish} className="text-xs px-3 py-1 rounded bg-emerald-600 text-white">Got it ✓</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
