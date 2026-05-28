'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'outcome_nudge_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // re-surface a week after dismiss

// Server decides eligibility (has completed sessions, no recent outcome
// logged). This component adds a client-side dismiss cooldown so the nudge
// isn't nagging — same gate philosophy as DebriefFeedbackModal.
export function OutcomeNudgeCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const at = Number(raw);
        if (Number.isFinite(at) && Date.now() - at < COOLDOWN_MS) return;
      }
    } catch {
      // localStorage unavailable (private mode) — fall through and show.
    }
    // localStorage is client-only, so the mount gate must run in an effect;
    // the SSR/first render is intentionally false to avoid a hydration flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore — worst case it shows again next load
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <section className="px-4 sm:px-8 py-10">
      <div
        className="max-w-5xl mx-auto rounded-lg p-6 sm:p-8"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--hupr-cognac)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div style={{ maxWidth: '46ch' }}>
            <span
              className="hupr-mono-eyebrow"
              style={{ color: 'var(--hupr-cognac)' }}
            >
              Had a real interview?
            </span>
            <p
              className="mt-2"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 'clamp(20px, 3vw, 28px)',
                lineHeight: 1.1,
              }}
            >
              Log what they actually asked.
            </p>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Wins and rejections both — it’s the one thing CasePad has that ChatGPT
              never will: what your batch is being asked, this cycle.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="text-sm px-3 py-2 rounded-md"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              Not now
            </button>
            <Link
              href="/outcomes"
              onClick={dismiss}
              className="text-sm px-4 py-2 rounded-md"
              style={{ background: 'var(--hupr-cognac)', color: '#FFFFFF' }}
            >
              Log it →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
