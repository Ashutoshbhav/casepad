'use client';

import { useState } from 'react';
import {
  logInterviewOutcome,
  type OutcomeKind,
} from '@/server-actions/log-interview-outcome';

const OUTCOME_OPTIONS: { value: OutcomeKind; label: string }[] = [
  { value: 'offered', label: 'Got the offer' },
  { value: 'rejected', label: 'Didn’t get it' },
  { value: 'pending', label: 'Awaiting result' },
  { value: 'withdrew', label: 'I withdrew' },
];

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-sunken)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
};

function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function InterviewOutcomeForm({ source = 'outcomes' }: { source?: string }) {
  const [firm, setFirm] = useState('');
  const [role, setRole] = useState('');
  const [interviewDate, setInterviewDate] = useState(todayISO());
  const [round, setRound] = useState('');
  const [outcome, setOutcome] = useState<OutcomeKind | null>(null);
  const [asked, setAsked] = useState('');
  const [topics, setTopics] = useState('');
  const [verification, setVerification] = useState('');
  const [prepared, setPrepared] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setFirm('');
    setRole('');
    setInterviewDate(todayISO());
    setRound('');
    setOutcome(null);
    setAsked('');
    setTopics('');
    setVerification('');
    setPrepared(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!outcome) {
      setError('Pick how it went.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await logInterviewOutcome({
        firm,
        role: role || null,
        interviewDate,
        round: round || null,
        outcome,
        asked: asked || null,
        caseTopics: topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        verification: verification || null,
        preparedWithCasepad: prepared,
        source,
      });

      if (res.ok) {
        reset();
        setDone(true);
        return;
      }
      if (res.reason === 'not_ready') {
        setError('Outcome logging is being set up — please try again shortly.');
      } else if (res.reason === 'auth') {
        setError('Your session expired. Refresh and sign in again.');
      } else {
        setError(res.message);
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-md p-6"
        style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border)' }}
      >
        <p
          className="font-headline uppercase"
          style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 18 }}
        >
          Logged. Thank you.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          This is the data no chatbot has — what your batch is actually being asked, right now.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 px-4 py-2 rounded-md text-sm"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
        >
          Log another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Logging rejections is what makes CasePad sharper for your batch — log every real
        interview, not just the wins.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Firm" required>
          <input
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            maxLength={120}
            required
            placeholder="McKinsey, Bain, BCG…"
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Role (optional)">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={120}
            placeholder="Associate Consultant, Summer Intern…"
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Interview date" required>
          <input
            type="date"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Round (optional)">
          <input
            value={round}
            onChange={(e) => setRound(e.target.value)}
            maxLength={40}
            placeholder="R1, R2, Partner round…"
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
      </div>

      <fieldset>
        <legend
          className="hupr-mono-eyebrow mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          How did it go?
        </legend>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_OPTIONS.map((o) => {
            const selected = outcome === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setOutcome(o.value)}
                className="px-3 py-2 rounded-md text-sm transition-colors"
                style={{
                  // Every outcome — including rejection — styled identically.
                  // No red, no negative cue. We want rejections logged.
                  background: selected ? 'var(--color-accent)' : 'var(--color-bg-sunken)',
                  border: `1px solid ${
                    selected ? 'var(--color-accent)' : 'var(--color-border)'
                  }`,
                  color: selected
                    ? 'var(--color-accent-fg)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="What did they actually ask? (the gold)">
        <textarea
          value={asked}
          onChange={(e) => setAsked(e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="The case prompt, the curveballs, the math they pushed on, behavioral Qs…"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Topics / case types (optional, comma-separated)">
        <input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="profitability, market entry, guesstimate"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Verification (optional but valuable)">
        <textarea
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Paste the offer/reject email text, or the recruiter's name + email. Stays private to you."
          className="w-full rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <input
          type="checkbox"
          checked={prepared}
          onChange={(e) => setPrepared(e.target.checked)}
        />
        I prepped for this interview on CasePad
      </label>

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-signal-danger)' }} role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2.5 rounded-md text-sm"
        style={{
          background: 'var(--hupr-cognac)',
          color: '#FFFFFF',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Logging…' : 'Log this interview'}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="hupr-mono-eyebrow block mb-1.5"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-signal-danger)' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
