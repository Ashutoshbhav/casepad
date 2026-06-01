import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { isMissingTable } from '@/lib/supabase/missing-table';
import { InterviewOutcomeForm } from '@/components/interview-outcome-form';

export const dynamic = 'force-dynamic';

interface OutcomeRow {
  id: string;
  firm: string;
  role: string | null;
  interview_date: string;
  round: string | null;
  outcome: string;
  asked: string | null;
  case_topics: string[] | null;
  prepared_with_casepad: boolean;
  created_at: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  offered: 'Offer',
  rejected: 'No offer',
  pending: 'Awaiting',
  withdrew: 'Withdrew',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function OutcomesPage() {
  const { supabase, user } = await requireUser();

  // Fail open: if migration 0014 isn't applied yet, the table is missing —
  // render the page with an empty history rather than crashing. withRetry
  // never throws (returns {data,error}), so there is no catch to write; we
  // inspect `error` directly and surface anything that isn't the expected
  // "table not created yet" (42P01).
  const { data, error } = await withRetry(() =>
    supabase
      .from('interview_outcomes')
      .select(
        'id, firm, role, interview_date, round, outcome, asked, case_topics, prepared_with_casepad, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
  );
  if (error && !isMissingTable(error)) {
    console.warn('[outcomes] history fetch failed:', error);
  }
  const outcomes: OutcomeRow[] =
    !error && Array.isArray(data) ? (data as OutcomeRow[]) : [];

  return (
    <main className="px-4 sm:px-8 py-12 lg:py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="hupr-mono-eyebrow"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Dashboard
        </Link>

        <h1
          className="uppercase mt-4 mb-3"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 'clamp(36px, 7vw, 72px)',
            lineHeight: 0.95,
            color: 'var(--color-text-primary)',
          }}
        >
          Real interviews
        </h1>
        <p
          className="mb-10 text-sm"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
        >
          When you sit a real consulting interview, log what they actually asked. This is
          the one thing CasePad has that no chatbot does — ground truth from your batch,
          this cycle.
        </p>

        <section
          className="rounded-lg p-6 sm:p-8 mb-12"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <InterviewOutcomeForm source="outcomes" />
        </section>

        <h2
          className="hupr-mono-eyebrow mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your logged interviews ({outcomes.length})
        </h2>

        {outcomes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Nothing logged yet. The first one starts the record.
          </p>
        ) : (
          <ul className="space-y-3">
            {outcomes.map((o) => (
              <li
                key={o.id}
                className="rounded-md p-4"
                style={{
                  background: 'var(--color-bg-sunken)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span
                    style={{
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    {o.firm}
                    {o.role ? <span style={{ fontWeight: 400 }}> · {o.role}</span> : null}
                  </span>
                  <span
                    className="hupr-mono-eyebrow"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {OUTCOME_LABEL[o.outcome] ?? o.outcome}
                  </span>
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {fmtDate(o.interview_date)}
                  {o.round ? ` · ${o.round}` : ''}
                  {o.prepared_with_casepad ? ' · prepped on CasePad' : ''}
                </div>
                {o.asked ? (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}
                  >
                    {o.asked}
                  </p>
                ) : null}
                {o.case_topics && o.case_topics.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.case_topics.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
