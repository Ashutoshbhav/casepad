import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Admin hub — HUPR mono. Only visible to ADMIN_EMAIL.

export default async function AdminHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;

  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return (
      <main
        className="min-h-screen p-12 max-w-2xl mx-auto"
        style={{ background: 'var(--color-bg-canvas)' }}
      >
        <Link href="/cases" className="hupr-mono-eyebrow underline">← back to cases</Link>
        <h1
          className="uppercase mt-4"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 32,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Not admin.
        </h1>
      </main>
    );
  }

  const admin = createSupabaseAdminClient();
  const [allowlistRes, casesRes, sessionsRes] = await Promise.all([
    admin.from('email_allowlist').select('email', { count: 'exact', head: true }),
    admin.from('cases').select('id', { count: 'exact', head: true }),
    admin.from('sessions').select('id', { count: 'exact', head: true }),
  ]);

  const allowlistCount = allowlistRes.count ?? 0;
  const caseCount = casesRes.count ?? 0;
  const sessionCount = sessionsRes.count ?? 0;

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* HERO band — slate (admin = data-driven, not coral) */}
      <section
        className="px-6 sm:px-12 py-12 sm:py-16"
        style={{ background: 'var(--hupr-slate)', color: '#FFFFFF' }}
      >
        <div className="max-w-5xl mx-auto">
          <Link href="/cases" className="hupr-mono-eyebrow underline" style={{ color: '#FFFFFF' }}>
            ← back to cases
          </Link>
          <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0 0' }} />
          <h1
            className="uppercase mt-6"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 72px)',
              lineHeight: 1,
              color: '#FFFFFF',
              margin: 0,
            }}
          >
            Admin
          </h1>
          <p
            className="mt-3"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Signed in as {user.email}
          </p>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-5xl mx-auto">
        {/* Stats grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-px mb-12" style={{ background: 'var(--color-border)' }}>
          <Stat label="Cohort members" value={String(allowlistCount)} />
          <Stat label="Cases" value={String(caseCount)} />
          <Stat label="Sessions" value={String(sessionCount)} />
        </section>

        {/* Tools — news-pair list rows */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Tools</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <ul style={{ borderTop: '1px solid var(--color-border)' }}>
            <AdminLink
              href="/admin/activity"
              title="Cohort activity"
              desc="What every cohort member is doing — sessions, scores, transcripts, drill-down."
            />
            <AdminLink
              href="/admin/allowlist"
              title="Allowlist"
              desc="Add or remove cohort emails. Only people on this list can sign in."
            />
            <AdminLink
              href="/dashboard"
              title="My dashboard"
              desc="Your own session history and scores."
            />
            <AdminLink
              href="/cases?all=1"
              title="All cases (incl. short prompts)"
              desc="View all 1,165 rows including ones hidden from the cohort."
            />
            <AdminLink
              href="/how-it-works"
              title="How it works"
              desc="The 10-section reference page (cohort-facing)."
            />
          </ul>
        </section>

        {/* Quick reference */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Quick reference</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <div
            className="p-6"
            style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border)' }}
          >
            <ul
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--color-text-secondary)',
                margin: 0,
                paddingLeft: 18,
              }}
            >
              <li>
                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                  ADMIN_EMAIL
                </code>{' '}
                in <code style={{ fontFamily: 'var(--font-mono)' }}>.env.local</code> controls who
                sees this page. Change it to transfer admin.
              </li>
              <li>
                Add a cohort member at{' '}
                <Link href="/admin/allowlist" style={{ textDecoration: 'underline', color: 'var(--color-text-primary)' }}>
                  /admin/allowlist
                </Link>
                {' '}— type email, hit Add. They&apos;ll get magic-link access.
              </li>
              <li>To remove: same page → click &quot;remove&quot; on the row.</li>
              <li>
                Supabase free tier rate-limits magic emails ~3-5/min globally. Don&apos;t bulk-onboard
                50 people at once.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-canvas)',
        padding: '24px 20px',
      }}
    >
      <div className="hupr-mono-eyebrow" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div
        className="mt-2 tabular-nums"
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.005em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block py-5 px-1 case-row group"
        style={{
          borderBottom: '1px solid var(--color-border)',
          textDecoration: 'none',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h3
            className="uppercase"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 22,
              lineHeight: 1.15,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-muted)',
            }}
          >
            Open →
          </span>
        </div>
        <p
          className="mt-2 max-w-3xl"
          style={{
            fontFamily: 'var(--font-accent)',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {desc}
        </p>
      </Link>
    </li>
  );
}
