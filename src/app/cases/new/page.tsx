import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UserCaseForm } from '@/components/user-case-form';

export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');

  return (
    <main className="px-4 sm:px-8 py-12 lg:py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/cases"
          className="hupr-mono-eyebrow"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Cases
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
          Bring your own case
        </h1>
        <p
          className="mb-10 text-sm"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '54ch' }}
        >
          When the library doesn&apos;t have the exact scenario you want to drill,
          paste your own. Custom cases stay private to your account — they never
          surface in the cohort library and they don&apos;t dilute the curated
          casebook.
        </p>

        <section
          className="rounded-lg p-6 sm:p-8"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <UserCaseForm />
        </section>

        <p
          className="mt-8 text-xs"
          style={{ color: 'var(--color-text-muted)', maxWidth: '54ch' }}
        >
          What gets created: a case row tied to your user ID, marked as a user case
          (invisible to anyone else), with the prompt you provide. The interviewer
          runs free-form against your prompt — no preset reveals, no curated
          framework grading; the evaluator scores you on structure, math discipline,
          and synthesis the same as any other case.
        </p>
      </div>
    </main>
  );
}
