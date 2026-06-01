import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { addEmailToAllowlist, removeEmailFromAllowlist } from '@/server-actions/manage-allowlist';

export default async function AllowlistPage() {
  const { user } = await requireUser();
  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return (
      <main className="p-12" style={{ background: 'var(--color-bg-canvas)' }}>
        <h1
          className="uppercase"
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
  // withRetry never throws — a DB blip degrades `rows` to null (rendered as
  // the empty state below) instead of crashing the allowlist page.
  const admin = createSupabaseAdminClient();
  const { data: rows } = await withRetry(() =>
    admin
      .from('email_allowlist')
      .select('*')
      .order('added_at', { ascending: false })
  );

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* HERO band — sage */}
      <section
        className="px-6 sm:px-12 py-12 sm:py-16"
        style={{ background: 'var(--hupr-sage)', color: '#FFFFFF' }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin"
            className="hupr-mono-eyebrow underline"
            style={{ color: '#FFFFFF' }}
          >
            ← admin hub
          </Link>
          <hr
            style={{
              border: 0,
              borderTop: '1px solid rgba(255,255,255,0.4)',
              margin: '8px 0 0',
            }}
          />
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
            Cohort allowlist
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
            Only emails on this list can sign in.
          </p>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-3xl mx-auto">
        {/* Add form */}
        <form action={addEmailToAllowlist} className="flex flex-col sm:flex-row gap-3 mb-10">
          <input
            name="email"
            type="email"
            required
            placeholder="someone@school.edu"
            className="flex-1 px-4 py-3"
            style={{
              background: 'var(--color-bg-canvas)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="hupr-anim-btn"
            style={{
              padding: '12px 22px',
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg-canvas)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              display: 'inline-block',
            }}
          >
            Add
          </button>
        </form>

        {/* List */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="hupr-mono-eyebrow">{rows?.length ?? 0} on the list</span>
          <span
            className="flex-1 h-px"
            style={{ background: 'var(--color-border)' }}
            aria-hidden
          />
        </div>
        <ul style={{ borderTop: '1px solid var(--color-border)' }}>
          {(rows ?? []).map((r) => (
            <li
              key={r.email}
              className="flex items-center justify-between"
              style={{
                borderBottom: '1px solid var(--color-border)',
                padding: '14px 4px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                }}
              >
                {r.email}
              </span>
              <form action={removeEmailFromAllowlist.bind(null, r.email)}>
                <button
                  type="submit"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-signal-danger)',
                    cursor: 'pointer',
                    padding: 4,
                    textDecoration: 'underline',
                  }}
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
          {(rows ?? []).length === 0 && (
            <li
              style={{
                borderBottom: '1px solid var(--color-border)',
                padding: '24px 4px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              No emails yet — add the first cohort member above.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
