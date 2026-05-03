import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Admin activity view — full visibility into what every cohort member is
// doing. Service-role client bypasses RLS so we can see across-user data.
// Only ADMIN_EMAIL sees this. Linked from /admin hub.

export default async function AdminActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  if (session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return (
      <main className="min-h-screen p-8">
        <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</Link>
        <h1 className="text-2xl font-semibold mt-3">Not admin.</h1>
      </main>
    );
  }

  const admin = createSupabaseAdminClient();

  // Fetch in parallel: all sessions, all users, allowlist, recent feedback.
  const [sessionsRes, usersRes, allowlistRes, feedbackRes] = await Promise.all([
    admin
      .from('sessions')
      .select('id, user_id, case_id, status, score, started_at, ended_at, track, transcript, cases(title, case_type)')
      .order('started_at', { ascending: false })
      .limit(500),
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('email_allowlist').select('email, added_at').order('added_at', { ascending: false }),
    admin.from('session_feedback').select('session_id, sentiment, free_text, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const allSessions = sessionsRes.data ?? [];
  const allUsers = usersRes.data?.users ?? [];
  const allowlist = allowlistRes.data ?? [];
  const recentFeedback = feedbackRes.data ?? [];

  // Build per-user stats by joining users + sessions.
  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const sessionsByUser = new Map<string, typeof allSessions>();
  for (const s of allSessions) {
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
    sessionsByUser.get(s.user_id)!.push(s);
  }

  type UserStats = {
    user_id: string;
    email: string;
    track: string;
    total_sessions: number;
    completed: number;
    in_progress: number;
    abandoned: number;
    avg_score: number;
    last_active: string | null;
    total_minutes: number;
    created_at: string;
  };

  const userStats: UserStats[] = allUsers.map((u) => {
    const userSessions = sessionsByUser.get(u.id) ?? [];
    const completed = userSessions.filter((s) => s.status === 'completed');
    const totalMinutes = userSessions.reduce((acc, s) => {
      if (!s.started_at) return acc;
      const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      return acc + Math.round((end - new Date(s.started_at).getTime()) / 60_000);
    }, 0);
    const lastActive = userSessions[0]?.started_at ?? null;
    return {
      user_id: u.id,
      email: u.email ?? '(no email)',
      track: ((u.user_metadata?.preferred_track as string) ?? 'unset'),
      total_sessions: userSessions.length,
      completed: completed.length,
      in_progress: userSessions.filter((s) => s.status === 'in_progress').length,
      abandoned: userSessions.filter((s) => s.status === 'abandoned').length,
      avg_score: completed.length
        ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
        : 0,
      last_active: lastActive,
      total_minutes: totalMinutes,
      created_at: u.created_at,
    };
  }).sort((a, b) => {
    // Active users first (last_active desc), then never-active
    if (a.last_active && !b.last_active) return -1;
    if (!a.last_active && b.last_active) return 1;
    if (a.last_active && b.last_active) return b.last_active.localeCompare(a.last_active);
    return b.created_at.localeCompare(a.created_at);
  });

  // Cohort-wide aggregates
  const totalSessions = allSessions.length;
  const completedSessions = allSessions.filter((s) => s.status === 'completed').length;
  const last24h = allSessions.filter((s) => s.started_at && (Date.now() - new Date(s.started_at).getTime()) < 24 * 3600 * 1000).length;
  const activeUsers24h = new Set(
    allSessions
      .filter((s) => s.started_at && (Date.now() - new Date(s.started_at).getTime()) < 24 * 3600 * 1000)
      .map((s) => s.user_id)
  ).size;

  // Top case_types (engagement signal)
  const typeCount: Record<string, number> = {};
  for (const s of allSessions) {
    const t = ((s as any).cases?.case_type as string) ?? 'unknown';
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300">← admin hub</Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-1">📊 Cohort activity</h1>
        <p className="text-xs text-zinc-500">Service-role view — full visibility across all users.</p>
      </header>

      {/* Aggregates */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Cohort size" value={String(allowlist.length)} />
        <Stat label="Active 24h" value={`${activeUsers24h}`} />
        <Stat label="Sessions 24h" value={String(last24h)} />
        <Stat label="Sessions all-time" value={`${totalSessions} (${completedSessions} done)`} />
      </section>

      {/* Per-user table */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Per-user activity</h2>
        <div className="rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900 text-zinc-400 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Track</th>
                <th className="text-right px-3 py-2">Sessions</th>
                <th className="text-right px-3 py-2">Completed</th>
                <th className="text-right px-3 py-2">In-prog</th>
                <th className="text-right px-3 py-2">Avg score</th>
                <th className="text-right px-3 py-2">Time (min)</th>
                <th className="text-right px-3 py-2">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {userStats.map((u) => (
                <tr key={u.user_id} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/activity/${u.user_id}`} className="text-zinc-200 hover:text-emerald-300">
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{u.track}</td>
                  <td className="px-3 py-2 text-right">{u.total_sessions}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">{u.completed}</td>
                  <td className="px-3 py-2 text-right text-amber-400">{u.in_progress}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">{u.avg_score || '—'}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{u.total_minutes}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">
                    {u.last_active ? formatRel(u.last_active) : 'never'}
                  </td>
                </tr>
              ))}
              {userStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    No registered users yet. Add cohort members at <Link href="/admin/allowlist" className="underline">/admin/allowlist</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">Click an email to see that user&apos;s session list + transcripts.</p>
      </section>

      {/* Recent activity feed */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent sessions (last 30)</h2>
        <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800">
          {allSessions.slice(0, 30).map((s) => {
            const u = userById.get(s.user_id);
            return (
              <Link
                key={s.id}
                href={`/admin/activity/${s.user_id}#session-${s.id}`}
                className="block px-3 py-2 hover:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{((s as any).cases?.title) || '(deleted case)'}</div>
                    <div className="text-[10px] text-zinc-500">
                      {u?.email ?? s.user_id.slice(0, 8)} · {new Date(s.started_at).toLocaleString()} · {s.track ?? 'no-track'}
                    </div>
                  </div>
                  <div className="text-xs whitespace-nowrap">
                    {s.status === 'completed' ? (
                      <span className="text-emerald-400">{s.score}/100</span>
                    ) : s.status === 'in_progress' ? (
                      <span className="text-amber-400">in progress</span>
                    ) : (
                      <span className="text-zinc-500">{s.status}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {allSessions.length === 0 && (
            <div className="px-3 py-6 text-center text-zinc-500 text-sm">No sessions yet across the cohort.</div>
          )}
        </div>
      </section>

      {/* Engagement by case type */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Engagement by case type</h2>
        <div className="flex flex-wrap gap-2">
          {topTypes.map(([type, count]) => (
            <span key={type} className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-300">
              {type.replace('_', ' ')}: <span className="text-emerald-300">{count}</span>
            </span>
          ))}
          {topTypes.length === 0 && <span className="text-xs text-zinc-500">No data yet.</span>}
        </div>
      </section>

      {/* Recent user feedback */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent feedback</h2>
        <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800">
          {recentFeedback.map((f, i) => (
            <div key={i} className="px-3 py-2 text-xs">
              <span className={
                f.sentiment === 'helpful' ? 'text-emerald-400' :
                f.sentiment === 'confused' ? 'text-amber-400' : 'text-rose-400'
              }>{f.sentiment}</span>
              {f.free_text && <span className="text-zinc-300 ml-2">— &quot;{f.free_text}&quot;</span>}
              <span className="text-zinc-600 ml-2">{formatRel(f.created_at)}</span>
            </div>
          ))}
          {recentFeedback.length === 0 && (
            <div className="px-3 py-3 text-zinc-500 text-xs">No feedback submitted yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
      <div className="text-xl sm:text-2xl font-semibold mt-1 text-zinc-100">{value}</div>
    </div>
  );
}

function formatRel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
