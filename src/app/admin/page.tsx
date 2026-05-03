import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Admin hub — only visible to ADMIN_EMAIL. Quick links to admin-only tools
// (allowlist, ingest stats, etc) so the admin doesn't have to memorize URLs.

export default async function AdminHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;

  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return (
      <main className="min-h-screen p-8 max-w-2xl mx-auto">
        <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</Link>
        <h1 className="text-2xl font-semibold mt-3">Not admin.</h1>
      </main>
    );
  }

  // Quick stats — give the admin a single dashboard to land on.
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
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-1">⚙ Admin</h1>
        <p className="text-sm text-zinc-500">Signed in as <span className="text-zinc-300">{user.email}</span></p>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <Stat label="Cohort members" value={String(allowlistCount)} />
        <Stat label="Cases" value={String(caseCount)} />
        <Stat label="Sessions" value={String(sessionCount)} />
      </section>

      {/* Tools */}
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <AdminLink
          href="/admin/allowlist"
          icon="📧"
          title="Allowlist"
          desc="Add / remove cohort emails. Only people on this list can sign in."
        />
        <AdminLink
          href="/dashboard"
          icon="📊"
          title="My dashboard"
          desc="Your own session history + scores."
        />
        <AdminLink
          href="/cases?all=1"
          icon="🗂"
          title="All cases (incl. short prompts)"
          desc="View all 1,165 rows including ones hidden from the cohort."
        />
        <AdminLink
          href="/how-it-works"
          icon="📖"
          title="How it works"
          desc="The 10-section reference page (cohort-facing)."
        />
      </div>

      {/* Quick admin reference */}
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Quick reference</h2>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 space-y-2">
        <div><span className="text-zinc-300 font-mono">ADMIN_EMAIL</span> in `.env.local` controls who sees this page. Change it to transfer admin.</div>
        <div>To add a cohort member: <Link href="/admin/allowlist" className="text-emerald-400 underline">/admin/allowlist</Link> → type email → Add. They&apos;ll get magic-link access.</div>
        <div>To remove: same page → click &quot;remove&quot; next to their row.</div>
        <div>Supabase free tier rate-limits magic emails ~3-5/min globally. Don&apos;t bulk-onboard 50 people at once.</div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-zinc-100">{value}</div>
    </div>
  );
}

function AdminLink({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 hover:border-amber-700 hover:bg-amber-950/10 transition p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-medium text-zinc-100 mb-0.5">{title}</div>
          <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
        </div>
      </div>
    </Link>
  );
}
