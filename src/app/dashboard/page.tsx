import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ScoreCurve } from '@/components/score-curve';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, started_at, score, case_id, status, cases(title, case_type)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20);

  const completed = (sessions ?? []).filter((s) => s.status === 'completed');
  const avg = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
    : 0;

  const byType: Record<string, { sum: number; n: number }> = {};
  for (const s of completed) {
    const t = (s as any).cases?.case_type ?? 'other';
    byType[t] = byType[t] ?? { sum: 0, n: 0 };
    byType[t].sum += s.score ?? 0;
    byType[t].n += 1;
  }
  const weakSpots = Object.entries(byType)
    .map(([t, v]) => ({ type: t, avg: Math.round(v.sum / v.n), n: v.n }))
    .filter((w) => w.avg < 65 && w.n >= 2);

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/cases" className="text-sm text-zinc-400 hover:text-zinc-200">All cases →</Link>
      </header>

      <section className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Sessions" value={String((sessions ?? []).length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Avg score" value={`${avg}`} />
      </section>

      <section className="mb-8">
        <ScoreCurve points={completed.slice().reverse().map((s: any) => ({
          date: s.started_at,
          score: s.score ?? 0,
        }))} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent sessions</h2>
        <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
          {(sessions ?? []).map((s: any) => (
            <Link
              key={s.id}
              href={s.status === 'completed' ? `/debrief/${s.id}` : `/solve/${s.case_id}?session=${s.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900"
            >
              <div>
                <div className="text-sm">{s.cases?.title ?? 'Untitled case'}</div>
                <div className="text-xs text-zinc-500">{new Date(s.started_at).toLocaleString()}</div>
              </div>
              <div className="text-sm">{s.status === 'completed' ? `${s.score ?? 0}/100` : <span className="text-amber-400">in progress</span>}</div>
            </Link>
          ))}
          {(sessions ?? []).length === 0 && <div className="px-4 py-6 text-sm text-zinc-500">No sessions yet — start one from <a href="/cases" className="underline">Cases</a>.</div>}
        </div>
      </section>

      {weakSpots.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Weak spots</h2>
          <div className="flex flex-wrap gap-2">
            {weakSpots.map((w) => (
              <span key={w.type} className="text-xs px-3 py-1.5 rounded bg-rose-900/30 text-rose-300">
                {w.type.replace('_', ' ')} · avg {w.avg} ({w.n})
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
