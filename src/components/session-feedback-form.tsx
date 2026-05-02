'use client';

import { useState } from 'react';

export function SessionFeedbackForm({ sessionId }: { sessionId: string }) {
  const [sentiment, setSentiment] = useState<'helpful' | 'confused' | 'bored' | null>(null);
  const [freeText, setFreeText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!sentiment) return;
    setSubmitting(true);
    try {
      await fetch('/api/session-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, sentiment, freeText }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-300">
        Thanks — feedback saved. Helps us improve the platform.
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-1">Quick feedback (1 min)</h3>
      <p className="text-xs text-zinc-500 mb-3">How was this case session?</p>
      <div className="flex gap-2 mb-3">
        {(['helpful', 'confused', 'bored'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSentiment(s)}
            className={`text-xs px-3 py-1.5 rounded ${
              sentiment === s
                ? s === 'helpful' ? 'bg-emerald-700 text-white'
                : s === 'confused' ? 'bg-amber-700 text-white'
                : 'bg-rose-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s === 'helpful' ? '✓ Helpful' : s === 'confused' ? '? Confused' : '× Bored'}
          </button>
        ))}
      </div>
      {sentiment && (
        <>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Optional: what specifically? What broke or felt off?"
            className="w-full h-20 rounded bg-zinc-900 border border-zinc-800 p-2 text-xs focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 rounded bg-white text-zinc-900 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </>
      )}
    </div>
  );
}
