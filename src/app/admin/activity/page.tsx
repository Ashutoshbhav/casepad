import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Admin activity — HUPR mono. Service-role read of every cohort session.

export default async function AdminActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  if (session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
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
    if (a.last_active && !b.last_active) return -1;
    if (!a.last_active && b.last_active) return 1;
    if (a.last_active && b.last_active) return b.last_active.localeCompare(a.last_active);
    return b.created_at.localeCompare(a.created_at);
  });

  const totalSessions = allSessions.length;
  const completedSessions = allSessions.filter((s) => s.status === 'completed').length;
  const last24h = allSessions.filter((s) => s.started_at && (Date.now() - new Date(s.started_at).getTime()) < 24 * 3600 * 1000).length;
  const activeUsers24h = new Set(
    allSessions
      .filter((s) => s.started_at && (Date.now() - new Date(s.started_at).getTime()) < 24 * 3600 * 1000)
      .map((s) => s.user_id)
  ).size;

  const typeCount: Record<string, number> = {};
  for (const s of allSessions) {
    const t = ((s as any).cases?.case_type as string) ?? 'unknown';
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      {/* HERO band — slate */}
      <section
        className="px-6 sm:px-12 py-12 sm:py-16"
        style={{ background: 'var(--hupr-slate)', color: '#FFFFFF' }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href="/admin" className="hupr-mono-eyebrow underline" style={{ color: '#FFFFFF' }}>
            ← admin hub
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
            Cohort activity
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
            Service-role view — full visibility across all users.
          </p>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-6xl mx-auto">
        {/* Aggregates */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-12" style={{ background: 'var(--color-border)' }}>
          <Stat label="Cohort size" value={String(allowlist.length)} />
          <Stat label="Active 24h" value={String(activeUsers24h)} />
          <Stat label="Sessions 24h" value={String(last24h)} />
          <Stat label="All-time" value={`${totalSessions} (${completedSessions} done)`} />
        </section>

        {/* Per-user table */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Per-user activity</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <div
            className="overflow-x-auto"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <table
              className="w-full"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-primary)',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-bg-sunken)' }}>
                  <Th>Email</Th>
                  <Th>Track</Th>
                  <Th right>Sessions</Th>
                  <Th right>Completed</Th>
                  <Th right>In-prog</Th>
                  <Th right>Avg</Th>
                  <Th right>Min</Th>
                  <Th right>Last active</Th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u) => (
                  <tr key={u.user_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Td>
                      <Link
                        href={`/admin/activity/${u.user_id}`}
                        style={{ color: 'var(--color-text-primary)', textDecoration: 'underline' }}
                      >
                        {u.email}
                      </Link>
                    </Td>
                    <Td muted>{u.track}</Td>
                    <Td right>{u.total_sessions}</Td>
                    <Td right>{u.completed}</Td>
                    <Td right muted>{u.in_progress || '—'}</Td>
                    <Td right>{u.avg_score || '—'}</Td>
                    <Td right muted>{u.total_minutes}</Td>
                    <Td right muted>{u.last_active ? formatRel(u.last_active) : 'never'}</Td>
                  </tr>
                ))}
                {userStats.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      No registered users. Add cohort members at{' '}
                      <Link href="/admin/allowlist" style={{ textDecoration: 'underline' }}>
                        /admin/allowlist
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p
            className="mt-3"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Click an email for that user&apos;s transcripts.
          </p>
        </section>

        {/* Recent sessions */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Recent sessions (last 30)</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <ul style={{ borderTop: '1px solid var(--color-border)' }}>
            {allSessions.slice(0, 30).map((s) => {
              const u = userById.get(s.user_id);
              return (
                <li key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <Link
                    href={`/admin/activity/${s.user_id}#session-${s.id}`}
                    className="block py-3 px-1"
                    style={{ textDecoration: 'none', color: 'var(--color-text-primary)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="truncate"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            fontWeight: 700,
                            fontSize: 14,
                            textTransform: 'uppercase',
                            letterSpacing: '-0.005em',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {((s as any).cases?.title) || '(deleted case)'}
                        </div>
                        <div
                          className="mt-1"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {u?.email ?? s.user_id.slice(0, 8)} · {new Date(s.started_at).toLocaleString()} · {s.track ?? 'no-track'}
                        </div>
                      </div>
                      <div
                        className="whitespace-nowrap"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {s.status === 'completed' ? `${s.score}/100` : s.status}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {allSessions.length === 0 && (
              <li
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                }}
              >
                No sessions yet across the cohort.
              </li>
            )}
          </ul>
        </section>

        {/* Engagement by case type */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Engagement by case type</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <div className="flex flex-wrap gap-2">
            {topTypes.map(([type, count]) => (
              <span
                key={type}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-canvas)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-primary)',
                }}
              >
                {type.replace('_', ' ')} · {count}
              </span>
            ))}
            {topTypes.length === 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                No data yet.
              </span>
            )}
          </div>
        </section>

        {/* Recent feedback */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <span className="hupr-mono-eyebrow">Recent feedback</span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
          </div>
          <ul style={{ borderTop: '1px solid var(--color-border)' }}>
            {recentFeedback.map((f, i) => (
              <li
                key={i}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  padding: '12px 4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                }}
              >
                <span
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    color:
                      f.sentiment === 'positive'
                        ? 'var(--color-text-primary)'
                        : f.sentiment === 'neutral'
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-signal-danger)',
                  }}
                >
                  {f.sentiment}
                </span>
                {f.free_text && (
                  <span
                    className="ml-3"
                    style={{ fontFamily: 'var(--font-accent)', fontSize: 14, color: 'var(--color-text-secondary)' }}
                  >
                    &quot;{f.free_text}&quot;
                  </span>
                )}
                <span
                  className="ml-3"
                  style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {formatRel(f.created_at)}
                </span>
              </li>
            ))}
            {recentFeedback.length === 0 && (
              <li
                style={{
                  padding: '24px 4px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                No feedback submitted yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-bg-canvas)', padding: '24px 20px' }}>
      <div className="hupr-mono-eyebrow" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div
        className="mt-2 tabular-nums"
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: 32,
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

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      style={{
        padding: '10px 14px',
        textAlign: right ? 'right' : 'left',
        color: muted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </td>
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
