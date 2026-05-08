import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Per-user drill-in — HUPR mono. Service-role read of every session this user
// has run, with full transcript inline. Only ADMIN_EMAIL.

export default async function UserActivityPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  if (session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return (
      <main className="min-h-screen p-12" style={{ background: 'var(--color-bg-canvas)' }}>
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
  const [userRes, sessionsRes, feedbackRes] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from('sessions')
      .select('id, case_id, status, score, score_breakdown, started_at, ended_at, track, transcript, issue_tree, cases(title, case_type, difficulty)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false }),
    admin.from('session_feedback').select('session_id, sentiment, free_text, created_at').limit(50),
  ]);

  const user = userRes.data?.user;
  const sessions = sessionsRes.data ?? [];
  const feedbackBySession = new Map((feedbackRes.data ?? []).map((f) => [f.session_id, f]));

  if (!user) {
    return (
      <main className="min-h-screen p-12 max-w-3xl mx-auto" style={{ background: 'var(--color-bg-canvas)' }}>
        <Link href="/admin/activity" className="hupr-mono-eyebrow underline">← cohort activity</Link>
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
          User not found.
        </h1>
      </main>
    );
  }

  const completed = sessions.filter((s) => s.status === 'completed');
  const totalMinutes = sessions.reduce((acc, s) => {
    if (!s.started_at) return acc;
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    return acc + Math.round((end - new Date(s.started_at).getTime()) / 60_000);
  }, 0);

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg-canvas)' }}>
      {/* HERO band — slate */}
      <section
        className="px-6 sm:px-12 py-12 sm:py-16"
        style={{ background: 'var(--hupr-slate)', color: '#FFFFFF' }}
      >
        <div className="max-w-5xl mx-auto">
          <Link href="/admin/activity" className="hupr-mono-eyebrow underline" style={{ color: '#FFFFFF' }}>
            ← cohort activity
          </Link>
          <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0 0' }} />
          <h1
            className="uppercase mt-6"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1,
              color: '#FFFFFF',
              margin: 0,
              wordBreak: 'break-all',
            }}
          >
            {user.email}
          </h1>
          <div
            className="mt-4 flex flex-wrap gap-x-6 gap-y-2"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <span>track: {(user.user_metadata?.preferred_track as string) ?? 'unset'}</span>
            <span>joined: {new Date(user.created_at).toLocaleDateString()}</span>
            <span>{sessions.length} sessions ({completed.length} done)</span>
            <span>{totalMinutes} min</span>
          </div>
        </div>
      </section>

      <div className="px-6 sm:px-12 py-12 max-w-5xl mx-auto">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="hupr-mono-eyebrow">Sessions</span>
          <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} aria-hidden />
        </div>

        <ul style={{ borderTop: '1px solid var(--color-border)' }}>
          {sessions.map((s) => {
            const fb = feedbackBySession.get(s.id);
            const transcript = (s.transcript as { role: string; content: string; timestamp?: string }[]) ?? [];
            const breakdown = (s.score_breakdown as any) ?? {};
            const tree = (s.issue_tree as any) ?? null;
            const elapsedMin = s.started_at && s.ended_at
              ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000)
              : null;
            return (
              <li
                key={s.id}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <details id={`session-${s.id}`} style={{ overflow: 'hidden' }}>
                  <summary
                    className="cursor-pointer list-none"
                    style={{ padding: '16px 4px' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate uppercase"
                          style={{
                            fontFamily: 'var(--font-headline)',
                            fontWeight: 700,
                            fontSize: 18,
                            letterSpacing: '-0.005em',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {((s as any).cases?.title) ?? '(case deleted)'}
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
                          {((s as any).cases?.case_type) ?? '—'} · {((s as any).cases?.difficulty) ?? '—'} · {new Date(s.started_at).toLocaleString()}
                          {elapsedMin !== null && ` · ${elapsedMin} min`} · {transcript.length} turns
                          {fb && (
                            <span
                              className="ml-2"
                              style={{
                                color:
                                  fb.sentiment === 'positive'
                                    ? 'var(--color-text-primary)'
                                    : fb.sentiment === 'neutral'
                                    ? 'var(--color-text-secondary)'
                                    : 'var(--color-signal-danger)',
                                fontWeight: 700,
                              }}
                            >
                              · {fb.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="whitespace-nowrap"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {s.status === 'completed' ? `${s.score}/100` : s.status.replace('_', ' ')}
                      </div>
                    </div>
                  </summary>

                  <div
                    style={{
                      padding: '16px 4px 24px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Score breakdown */}
                    {Object.keys(breakdown).length > 0 && (
                      <div className="mb-6">
                        <div
                          className="hupr-mono-eyebrow mb-3"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Score breakdown
                        </div>
                        <div
                          className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                        >
                          {Object.entries(breakdown)
                            .filter(
                              ([k]) =>
                                k !== 'total' &&
                                k !== 'fallback_used' &&
                                k !== 'strengths' &&
                                k !== 'gaps' &&
                                k !== 'rewritten_excerpt' &&
                                k !== 'dimensions'
                            )
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span
                                  style={{
                                    color: 'var(--color-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {k.replace(/_/g, ' ')}
                                </span>
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {typeof v === 'number' ? v : '—'}
                                </span>
                              </div>
                            ))}
                        </div>
                        {breakdown.strengths && Array.isArray(breakdown.strengths) && (
                          <div
                            className="mt-3"
                            style={{
                              fontFamily: 'var(--font-accent)',
                              fontSize: 13,
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              Strengths:{' '}
                            </span>
                            {breakdown.strengths.join(' · ')}
                          </div>
                        )}
                        {breakdown.gaps && Array.isArray(breakdown.gaps) && (
                          <div
                            style={{
                              fontFamily: 'var(--font-accent)',
                              fontSize: 13,
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: 'var(--color-signal-danger)',
                              }}
                            >
                              Gaps:{' '}
                            </span>
                            {breakdown.gaps.join(' · ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transcript */}
                    {transcript.length > 0 && (
                      <div className="mb-6">
                        <div
                          className="hupr-mono-eyebrow mb-3"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Transcript ({transcript.length} turns)
                        </div>
                        <div
                          className="space-y-2 pr-2"
                          style={{ maxHeight: 480, overflowY: 'auto' }}
                        >
                          {transcript.map((t, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '10px 12px',
                                background:
                                  t.role === 'user'
                                    ? 'var(--color-bg-sunken)'
                                    : 'var(--color-bg-canvas)',
                                border: '1px solid var(--color-border)',
                                marginLeft: t.role === 'user' ? 32 : 0,
                                marginRight: t.role === 'user' ? 0 : 32,
                              }}
                            >
                              <div
                                className="hupr-mono-eyebrow"
                                style={{ color: 'var(--color-text-muted)', fontSize: 10 }}
                              >
                                {t.role}
                              </div>
                              <div
                                className="mt-1"
                                style={{
                                  fontFamily: 'var(--font-accent)',
                                  fontSize: 14,
                                  lineHeight: 1.55,
                                  color: 'var(--color-text-primary)',
                                }}
                              >
                                {t.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tree summary */}
                    {tree && tree.nodes && tree.nodes.length > 0 && (
                      <div className="mb-6">
                        <div
                          className="hupr-mono-eyebrow mb-2"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Issue tree ({tree.nodes.length} nodes)
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          MECE: {tree.rubric?.mece ?? 0} · depth: {tree.rubric?.depth_balance ?? 0} ·
                          hyp: {tree.rubric?.hypothesis_attached ?? 0} · root-driven:{' '}
                          {tree.rubric?.driven_from_issue ?? 0}
                        </div>
                      </div>
                    )}

                    {/* Feedback free-text */}
                    {fb?.free_text && (
                      <div
                        style={{
                          padding: 12,
                          background: 'var(--color-bg-sunken)',
                          border: '1px solid var(--color-border)',
                          fontFamily: 'var(--font-accent)',
                          fontSize: 13,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <div
                          className="hupr-mono-eyebrow"
                          style={{ color: 'var(--color-text-muted)', fontSize: 10 }}
                        >
                          Free-text feedback
                        </div>
                        <div className="mt-1">&quot;{fb.free_text}&quot;</div>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            );
          })}

          {sessions.length === 0 && (
            <li
              style={{
                borderBottom: '1px solid var(--color-border)',
                padding: '32px 4px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              This user hasn&apos;t run any sessions yet.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
