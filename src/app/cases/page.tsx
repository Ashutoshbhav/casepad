import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { CaseCard } from '@/components/case-card';
import { CaseFilters } from '@/components/case-filters';
import { CasesTour } from '@/components/cases-tour';
import { TutorialLaunchLink } from '@/components/tutorial-launch-link';
import { TRACKS, type Track } from '@/lib/tracks';
import { TUTORIAL_FIRST_CASE_ID, STARTER_CASE_IDS } from '@/lib/starter-cases';

export const dynamic = 'force-dynamic';

// Cases with `problem_statement` shorter than this are treated as partial /
// noisy extractions and hidden from the default grid. Users can re-enable
// them by appending `?all=1` to the URL.
const MIN_PROBLEM_STATEMENT_LEN = 80;

// Threshold under which a non-consulting track is considered "still
// backfilling" and we surface a banner + consulting fallback.
const SPARSE_TRACK_THRESHOLD = 50;

// Shape of the rows we actually fetch. Includes problem_statement so we can
// filter junk client-side (Supabase JS has no easy length() filter).
type CaseListRow = {
  id: string;
  title: string;
  industry: string;
  case_type: string;
  difficulty: string;
  source: string | null;
  problem_statement: string | null;
};

export default async function CasesPage({
  searchParams,
}: { searchParams: Promise<{ industry?: string; type?: string; difficulty?: string; q?: string; track?: string; all?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;
  const userTrack: Track = (user?.user_metadata?.preferred_track as Track) || 'consulting';
  const activeTrack: Track = (sp.track as Track) || userTrack;
  const showAll = sp.all === '1';
  const hasFilters = Boolean(sp.industry || sp.type || sp.difficulty || sp.q);

  // Only select fields CaseCard actually displays — full JSONB columns
  // (interviewer_notes, ideal_structure) bloat the payload to MB at 120 rows.
  // We fetch problem_statement so we can length-filter client-side; payload
  // bloat is minor at 60 rows.
  const { data: cases } = await withRetry(() => {
    let query = supabase
      .from('cases')
      .select('id,title,industry,case_type,difficulty,source,problem_statement')
      .contains('tracks', [activeTrack])
      .order('created_at', { ascending: false })
      .limit(60);
    if (sp.industry) query = query.eq('industry', sp.industry);
    if (sp.type) query = query.eq('case_type', sp.type);
    if (sp.difficulty) query = query.eq('difficulty', sp.difficulty);
    if (sp.q) query = query.ilike('title', `%${sp.q}%`);
    return query;
  });

  const allRows = (cases ?? []) as CaseListRow[];
  // Partition: full-length rows vs. short/null prompts.
  const isFullLength = (r: CaseListRow) =>
    r.problem_statement != null && r.problem_statement.length >= MIN_PROBLEM_STATEMENT_LEN;
  const fullLength = allRows.filter(isFullLength);
  const shortCount = allRows.length - fullLength.length;
  const visibleRows = showAll ? allRows : fullLength;

  // Featured starters: only show on default landing (no filters, no
  // non-default track). Avoids cluttering filtered/searched views.
  const showFeatured = !hasFilters && activeTrack === 'consulting';
  const { data: starterRows } = showFeatured
    ? await withRetry(() =>
        supabase
          .from('cases')
          .select('id,title,industry,case_type,difficulty,source,problem_statement')
          .in('id', STARTER_CASE_IDS)
      )
    : { data: null };
  // Preserve the curated order from STARTER_CASE_IDS instead of DB order.
  const starterById = new Map<string, CaseListRow>(
    (starterRows ?? []).map((r) => [r.id, r as CaseListRow])
  );
  const orderedStarters: CaseListRow[] = showFeatured
    ? STARTER_CASE_IDS.map((id) => starterById.get(id)).filter(
        (r): r is CaseListRow => Boolean(r)
      )
    : [];

  // Hide starter IDs from the main grid when we render them in Featured to
  // avoid duplication.
  const starterIdSet = new Set(orderedStarters.map((r) => r.id));
  const mainRows = showFeatured
    ? visibleRows.filter((r) => !starterIdSet.has(r.id))
    : visibleRows;

  // Sparse-track fallback: load consulting cases as a secondary grid when a
  // non-consulting track has thin coverage. We check the TRUE row count via
  // a count() query — not the limit-60 sample's post-filter size, which
  // would falsely flag 146-row tracks as sparse just because the displayed
  // sample is small.
  const isNonConsulting = activeTrack !== 'consulting';
  const trackTotal = isNonConsulting
    ? (await supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .contains('tracks', [activeTrack])).count ?? 0
    : 0;
  const isSparse = isNonConsulting && trackTotal < SPARSE_TRACK_THRESHOLD;
  const { data: fallbackRows } = isSparse
    ? await withRetry(() => {
        let q = supabase
          .from('cases')
          .select('id,title,industry,case_type,difficulty,source,problem_statement')
          .contains('tracks', ['consulting'])
          .order('created_at', { ascending: false })
          .limit(30);
        if (sp.industry) q = q.eq('industry', sp.industry);
        if (sp.type) q = q.eq('case_type', sp.type);
        if (sp.difficulty) q = q.eq('difficulty', sp.difficulty);
        if (sp.q) q = q.ilike('title', `%${sp.q}%`);
        return q;
      })
    : { data: null };
  const fallbackFiltered = ((fallbackRows ?? []) as CaseListRow[]).filter(isFullLength);

  const toggleHref = (() => {
    const next = new URLSearchParams();
    if (sp.industry) next.set('industry', sp.industry);
    if (sp.type) next.set('type', sp.type);
    if (sp.difficulty) next.set('difficulty', sp.difficulty);
    if (sp.q) next.set('q', sp.q);
    if (sp.track) next.set('track', sp.track);
    if (!showAll) next.set('all', '1');
    const qs = next.toString();
    return qs ? `/cases?${qs}` : '/cases';
  })();

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Cases</h1>
          <p className="text-xs text-zinc-500 mt-1">Track: {TRACKS[activeTrack].label}</p>
        </div>
        <TutorialLaunchLink className="text-xs sm:text-sm text-violet-300 hover:text-violet-200">
          🎓 Take me through a case →
        </TutorialLaunchLink>
      </header>
      <div data-tour="cases-track" className="flex gap-1 flex-wrap mb-4">
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
      <div data-tour="cases-filters">
        <CaseFilters />
      </div>

      {isSparse && (
        <div className="mb-5 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          <div className="font-medium mb-1">🔄 Sparse track</div>
          <p className="text-amber-200/80 leading-relaxed">
            Only {trackTotal} {TRACKS[activeTrack].short} case{trackTotal === 1 ? '' : 's'} in the library so far
            — we&apos;re also showing the broader consulting library below.
          </p>
        </div>
      )}

      {showFeatured && orderedStarters.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-200">
              <span className="text-amber-300">⭐ Featured starters</span>
              <span className="text-zinc-500 font-normal"> — guaranteed quality, full premium content</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedStarters.map((c) => (
              <div key={c.id}>
                <CaseCard c={c as any} featured />
              </div>
            ))}
          </div>
        </section>
      )}

      {showFeatured && orderedStarters.length > 0 && mainRows.length > 0 && (
        <h2 className="text-sm font-medium text-zinc-400 mb-3">More cases</h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mainRows.map((c, i) => (
          <div key={c.id} data-tour={i === 0 && !showFeatured ? 'cases-card' : undefined}>
            <CaseCard c={c as any} />
          </div>
        ))}
      </div>

      {!showAll && shortCount > 0 && (
        <div className="mt-6 text-xs text-zinc-500">
          {shortCount} case{shortCount === 1 ? '' : 's'} hidden because the prompt is incomplete.{' '}
          <a href={toggleHref} className="text-zinc-300 underline hover:text-zinc-100">
            Show all 1,165 cases (including short prompts)
          </a>
        </div>
      )}
      {showAll && (
        <div className="mt-6 text-xs text-zinc-500">
          Showing all cases including short / partial prompts.{' '}
          <a href={toggleHref} className="text-zinc-300 underline hover:text-zinc-100">
            Hide short prompts
          </a>
        </div>
      )}

      {isSparse && fallbackFiltered.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-zinc-300 mb-1">Cases from other tracks</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Drawn from the consulting library while {TRACKS[activeTrack].short} backfill catches up.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fallbackFiltered.map((c) => (
              <div key={c.id}>
                <CaseCard c={c as any} />
              </div>
            ))}
          </div>
        </section>
      )}

      {mainRows.length === 0 && orderedStarters.length === 0 && fallbackFiltered.length === 0 && (
        <div className="text-zinc-500 text-sm mt-12">No cases match these filters.</div>
      )}
      <CasesTour />
    </main>
  );
}
