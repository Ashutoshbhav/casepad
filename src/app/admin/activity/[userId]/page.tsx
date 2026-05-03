import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Per-user drill-in. Service-role read of every session this user has run,
// with full transcript inline (collapsible). Only ADMIN_EMAIL can view.

export default async function UserActivityPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
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
  const feedbackBySession = new Map(
    (feedbackRes.data ?? []).map((f) => [f.session_id, f])
  );

  if (!user) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto">
        <Link href="/admin/activity" className="text-sm text-zinc-500 hover:text-zinc-300">← cohort activity</Link>
        <h1 className="text-2xl font-semibold mt-3">User not found.</h1>
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
    <main className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link href="/admin/activity" className="text-sm text-zinc-500 hover:text-zinc-300">← cohort activity</Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-3 mb-1">{user.email}</h1>
        <div className="text-xs text-zinc-500 space-x-2">
          <span>track: <span className="text-zinc-300">{(user.user_metadata?.preferred_track as string) ?? 'unset'}</span></span>
          <span>· joined: {new Date(user.created_at).toLocaleDateString()}</span>
          <span>· {sessions.length} sessions ({completed.length} done)</span>
          <span>· {totalMinutes} total min</span>
        </div>
      </header>

      <section className="space-y-4">
        {sessions.map((s) => {
          const fb = feedbackBySession.get(s.id);
          const transcript = (s.transcript as { role: string; content: string; timestamp?: string }[]) ?? [];
          const breakdown = (s.score_breakdown as any) ?? {};
          const tree = (s.issue_tree as any) ?? null;
          const elapsedMin = s.started_at && s.ended_at
            ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000)
            : null;
          return (
            <details
              key={s.id}
              id={`session-${s.id}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden group"
            >
              <summary className="cursor-pointer px-4 py-3 hover:bg-zinc-900/60 list-none">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100 truncate">
                      {((s as any).cases?.title) ?? '(case deleted)'}
                      <span className="text-[10px] text-zinc-500 ml-2 uppercase">
                        {((s as any).cases?.case_type) ?? '—'} · {((s as any).cases?.difficulty) ?? '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {new Date(s.started_at).toLocaleString()}
                      {elapsedMin !== null && ` · ${elapsedMin} min`}
                      · {transcript.length} turns
                      {fb && (
                        <span className={`ml-2 ${fb.sentiment === 'helpful' ? 'text-emerald-400' : fb.sentiment === 'confused' ? 'text-amber-400' : 'text-rose-400'}`}>
                          · feedback: {fb.sentiment}
                        </span>
                      )}
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
              </summary>

              <div className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-4">
                {/* Score breakdown */}
                {Object.keys(breakdown).length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">Score breakdown</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                      {Object.entries(breakdown).filter(([k]) => k !== 'total' && k !== 'fallback_used' && k !== 'strengths' && k !== 'gaps' && k !== 'rewritten_excerpt' && k !== 'dimensions').map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="text-zinc-300">{typeof v === 'number' ? v : '—'}</span>
                        </div>
                      ))}
                    </div>
                    {breakdown.strengths && Array.isArray(breakdown.strengths) && (
                      <div className="mt-2 text-[11px]">
                        <span className="text-emerald-400">Strengths:</span>{' '}
                        <span className="text-zinc-400">{breakdown.strengths.join(' · ')}</span>
                      </div>
                    )}
                    {breakdown.gaps && Array.isArray(breakdown.gaps) && (
                      <div className="text-[11px]">
                        <span className="text-rose-400">Gaps:</span>{' '}
                        <span className="text-zinc-400">{breakdown.gaps.join(' · ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Transcript */}
                {transcript.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 mb-2">Transcript ({transcript.length} turns)</div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {transcript.map((t, i) => (
                        <div
                          key={i}
                          className={`text-xs rounded p-2 ${
                            t.role === 'user'
                              ? 'bg-zinc-800 ml-8 text-zinc-100'
                              : 'bg-zinc-900 border border-zinc-800 mr-8 text-zinc-300'
                          }`}
                        >
                          <div className="text-[9px] uppercase text-zinc-500 mb-0.5">{t.role}</div>
                          {t.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tree summary */}
                {tree && tree.nodes && tree.nodes.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">Issue tree ({tree.nodes.length} nodes)</div>
                    <div className="text-[11px] text-zinc-400">
                      MECE: {tree.rubric?.mece ?? 0} · depth: {tree.rubric?.depth_balance ?? 0} ·
                      hyp: {tree.rubric?.hypothesis_attached ?? 0} · root-driven: {tree.rubric?.driven_from_issue ?? 0}
                    </div>
                  </div>
                )}

                {/* Feedback free-text */}
                {fb?.free_text && (
                  <div className="rounded bg-zinc-900 border border-zinc-800 p-2 text-[11px] text-zinc-300">
                    <span className="text-zinc-500 uppercase text-[9px]">Free-text feedback:</span>{' '}
                    &quot;{fb.free_text}&quot;
                  </div>
                )}
              </div>
            </details>
          );
        })}

        {sessions.length === 0 && (
          <div className="rounded-lg border border-zinc-800 px-4 py-6 text-center text-zinc-500 text-sm">
            This user hasn&apos;t run any sessions yet.
          </div>
        )}
      </section>
    </main>
  );
}
