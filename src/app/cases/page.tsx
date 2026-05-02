import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CaseCard } from '@/components/case-card';
import { CaseFilters } from '@/components/case-filters';
import { TRACKS, type Track } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

export default async function CasesPage({
  searchParams,
}: { searchParams: Promise<{ industry?: string; type?: string; difficulty?: string; q?: string; track?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  const userTrack: Track = (user?.user_metadata?.preferred_track as Track) || 'consulting';
  const activeTrack: Track = (sp.track as Track) || userTrack;

  // Only select fields CaseCard actually displays — full JSONB columns
  // (interviewer_notes, ideal_structure) bloat the payload to MB at 120 rows.
  let query = supabase
    .from('cases')
    .select('id,title,industry,case_type,difficulty,source')
    .contains('tracks', [activeTrack])
    .order('created_at', { ascending: false })
    .limit(60);
  if (sp.industry) query = query.eq('industry', sp.industry);
  if (sp.type) query = query.eq('case_type', sp.type);
  if (sp.difficulty) query = query.eq('difficulty', sp.difficulty);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);

  const { data: cases } = await query;
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Cases</h1>
          <p className="text-xs text-zinc-500 mt-1">Track: {TRACKS[activeTrack].label}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <a href="/cheatsheet" className="text-emerald-300 hover:text-emerald-200">⚡ Cheat sheet</a>
          <a href="/onboarding/track" className="text-zinc-400 hover:text-zinc-200">Switch track</a>
          <a href="/dashboard" className="text-zinc-400 hover:text-zinc-200">Dashboard →</a>
        </nav>
      </header>
      <div className="flex gap-1 flex-wrap mb-4">
        {(['consulting','ib_pe_vc','pm','marketing','strategy_bizops'] as Track[]).map((t) => (
          <a
            key={t}
            href={`/cases?track=${t}`}
            className={`text-xs px-3 py-1 rounded ${activeTrack === t ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            {TRACKS[t].short}
          </a>
        ))}
      </div>
      <CaseFilters />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(cases ?? []).map((c) => <CaseCard key={c.id} c={c as any} />)}
      </div>
      {(cases ?? []).length === 0 && (
        <div className="text-zinc-500 text-sm mt-12">No cases match these filters.</div>
      )}
    </main>
  );
}
