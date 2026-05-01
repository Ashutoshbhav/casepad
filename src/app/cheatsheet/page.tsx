import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TRACKS, type Track } from '@/lib/tracks';
import { CheatsheetTabs } from '@/components/cheatsheet-tabs';

export const dynamic = 'force-dynamic';

export default async function CheatsheetPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const track: Track = (user.user_metadata?.preferred_track as Track) || 'consulting';

  // Pull last 10 completed sessions for the weakness-indexed view
  const { data: sessions } = await supabase
    .from('sessions')
    .select('score_breakdown, ended_at, track')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(10);

  const def = TRACKS[track];

  // Compute weakest dim
  const totals: Record<string, { sum: number; count: number; weight: number }> = {};
  const dimByName: Record<string, { weight: number }> = {};
  for (const r of def.rubric) {
    dimByName[r.dimension.toLowerCase().replace(/\s+/g, '_')] = { weight: r.weight };
  }
  for (const s of sessions || []) {
    const b = (s.score_breakdown ?? {}) as any;
    for (const [k, v] of Object.entries(b)) {
      if (typeof v !== 'number' || k === 'total') continue;
      if (!totals[k]) totals[k] = { sum: 0, count: 0, weight: dimByName[k]?.weight || 100 };
      totals[k].sum += v;
      totals[k].count++;
    }
  }
  const dimRatios = Object.entries(totals).map(([k, t]) => ({
    dim: k,
    avg: t.count ? t.sum / t.count : 0,
    weight: t.weight,
    ratio: t.count ? t.sum / t.count / t.weight : 1,
  })).sort((a, b) => a.ratio - b.ratio);

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cheat sheet</h1>
          <p className="text-xs text-zinc-500">{def.label} · {sessions?.length || 0} cases solved</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/company-pack" className="text-emerald-300 hover:text-emerald-200">📋 Company pack</a>
          <a href="/cases" className="text-zinc-400 hover:text-zinc-200">← cases</a>
        </nav>
      </header>

      <CheatsheetTabs track={track} weakestDims={dimRatios.slice(0, 3).map((r) => r.dim)} weakestStats={dimRatios.slice(0, 5)} />
    </main>
  );
}
