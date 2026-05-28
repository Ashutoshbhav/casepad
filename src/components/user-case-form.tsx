'use client';

import { useState, useTransition } from 'react';
import {
  createUserCase,
  type CaseTypeKind,
  type DifficultyKind,
  type IndustryKind,
  type CreateUserCaseResult,
} from '@/server-actions/create-user-case';

// Client form for "bring your own case". On submit, calls the server
// action which either redirects to /solve/{id} on success or returns a
// reason for failure (auth / not_ready / invalid / error).
//
// Intentionally plain-styled — this is a utility form, not a marketing
// surface. The hero treatment lives on the parent /cases/new page.

const CASE_TYPE_OPTIONS: { value: CaseTypeKind; label: string }[] = [
  { value: 'profitability', label: 'Profitability' },
  { value: 'market_entry', label: 'Market entry' },
  { value: 'operations', label: 'Operations' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'mna', label: 'M&A' },
  { value: 'gtm', label: 'Go-to-market' },
  { value: 'other', label: 'Other' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyKind; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

const INDUSTRY_OPTIONS: { value: IndustryKind; label: string }[] = [
  { value: 'consulting', label: 'Consulting' },
  { value: 'fmcg', label: 'FMCG' },
  { value: 'tech', label: 'Tech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'infra', label: 'Infra' },
  { value: 'energy', label: 'Energy' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Other' },
];

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-sunken)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
};

export function UserCaseForm() {
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [caseType, setCaseType] = useState<CaseTypeKind>('profitability');
  const [difficulty, setDifficulty] = useState<DifficultyKind>('medium');
  const [industry, setIndustry] = useState<IndustryKind>('other');

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      // On success the server action calls redirect() which throws
      // NEXT_REDIRECT, so we never see a {ok:true} return here — Next.js
      // intercepts and navigates. We only land in the result-handling
      // path below on a failure.
      let res: CreateUserCaseResult;
      try {
        res = await createUserCase({
          title,
          problemStatement,
          caseType,
          difficulty,
          industry,
        });
      } catch (err) {
        // NEXT_REDIRECT errors carry a digest — re-throw so the framework
        // can finish the navigation.
        if (err && typeof err === 'object' && 'digest' in err) {
          throw err;
        }
        console.error('[user-case-form] createUserCase threw:', err);
        setError('Something went wrong. Try again.');
        return;
      }
      if (res.ok) return; // unreachable (redirect already thrown)
      if (res.reason === 'auth') {
        setError('Your session expired — please sign in again.');
      } else if (res.reason === 'not_ready') {
        setError(
          'Custom cases are being set up — please try again shortly.'
        );
      } else {
        setError(res.message);
      }
    });
  };

  const len = problemStatement.length;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Paste a case prompt (real or one you&apos;ve made up) and solve it like any
        other case. Your custom cases stay private to you — never visible to the
        cohort.
      </p>

      <Field label="Title" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          placeholder="e.g. SaaS Reactivation Strategy"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Problem statement" required>
        <textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          maxLength={5000}
          required
          rows={8}
          placeholder="The full case prompt the interviewer would read aloud. Include the company, the situation, the question being asked, and any obvious data points. Aim for 200-1000 characters."
          className="w-full rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <div
          className="mt-1 text-[11px] flex justify-between"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>
            {len < 100
              ? `${100 - len} more characters needed`
              : `${len} / 5000`}
          </span>
          <span>The interviewer grounds entirely in this text.</span>
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Case type" required>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as CaseTypeKind)}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          >
            {CASE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty" required>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyKind)}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          >
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Industry" required>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as IndustryKind)}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
            style={inputStyle}
          >
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm"
          style={{ color: 'var(--color-signal-danger)' }}
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-md text-sm"
          style={{
            background: 'var(--hupr-cognac)',
            color: '#FFFFFF',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Creating…' : 'Create + start solving'}
        </button>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          You&apos;ll land directly in the solve flow.
        </span>
      </div>
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
