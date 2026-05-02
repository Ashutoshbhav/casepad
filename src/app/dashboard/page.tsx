import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ScoreCurve } from '@/components/score-curve';
import { TRACK_LIST, TRACKS, type Track } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))]
    .sort((a, b) => b.localeCompare(a));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (d.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const sp = await searchParams;
  const validTracks = TRACK_LIST as readonly string[];
  const trackFilter: Track | null = sp.track && validTracks.includes(sp.track) ? (sp.track as Track) : null;

  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, started_at, score, case_id, status, track, cases(title, case_type)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(200);

  const sessions = trackFilter ? (allSessions ?? []).filter((s: any) => s.track === trackFilter) : (allSessions ?? []).slice(0, 50);
  const completed = sessions.filter((s) => s.status === 'completed');
  const avg = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
    : 0;
  const streak = computeStreak(completed.map((s) => new Date(s.started_at)));

  // count sessions per track for filter pill labels
  const trackCounts: Record<string, number> = {};
  for (const s of allSessions ?? []) {
    const t = (s as any).track ?? 'other';
    trackCounts[t] = (trackCounts[t] ?? 0) + 1;
  }

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
    <main className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
        <Link href="/cases" className="text-xs sm:text-sm text-zinc-400 hover:text-zinc-200">All cases →</Link>
      </header>

      <nav className="flex flex-wrap gap-1.5 mb-5 text-xs">
        <Link
          href="/dashboard"
          className={`px-2.5 py-1 rounded ${trackFilter === null ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          All tracks ({(allSessions ?? []).length})
        </Link>
        {TRACK_LIST.map((k) => {
          const n = trackCounts[k] ?? 0;
          if (n === 0) return null;
          return (
            <Link
              key={k}
              href={`/dashboard?track=${k}`}
              className={`px-2.5 py-1 rounded ${trackFilter === k ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {TRACKS[k].short} ({n})
            </Link>
          );
        })}
      </nav>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Sessions" value={String((sessions ?? []).length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Avg score" value={`${avg}`} />
        <Stat label="Streak (days)" value={`${streak}${streak >= 3 ? ' 🔥' : ''}`} />
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
          {sessions.map((s: any) => (
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
          {sessions.length === 0 && <div className="px-4 py-6 text-sm text-zinc-500">{trackFilter ? `No sessions yet on the ${TRACKS[trackFilter].short} track.` : <>No sessions yet — start one from <a href="/cases" className="underline">Cases</a>.</>}</div>}
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
