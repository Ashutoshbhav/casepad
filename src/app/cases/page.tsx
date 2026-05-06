import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { CaseFilters } from '@/components/case-filters';
import { CasesTour } from '@/components/cases-tour';
import { TutorialLaunchLink } from '@/components/tutorial-launch-link';
import { CasesHero } from '@/components/cases-hero';
import { HuprMarquee } from '@/components/hupr-marquee';
import { CohortRail } from '@/components/cohort-rail';
import { CasesLoadMore } from '@/components/cases-load-more';
import { AsteriskSceneRegister } from '@/components/asterisk-scene-register';
import { CaseListLink } from '@/components/case-list-link';
import { TRACKS, type Track } from '@/lib/tracks';
import { STARTER_CASE_IDS } from '@/lib/starter-cases';

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

// Brass dot indicator for difficulty — ●○○ / ●●○ / ●●●. Ordered to render
// fill count followed by empties.
function DifficultyDots({ d }: { d: string }) {
  const fill = d === 'easy' ? 1 : d === 'medium' ? 2 : 3;
  return (
    <span
      aria-label={`Difficulty: ${d}`}
      className="inline-flex items-center gap-[3px] align-middle"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background:
              i < fill ? 'var(--color-accent)' : 'transparent',
            border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
          }}
        />
      ))}
    </span>
  );
}

// List-mode row — replaces the dense grid card for the main library.
// `completed` shows a faint checkmark in the right gutter so users see
// the cases they've already done at a glance. Linear's done-state pattern.
function CaseListRowItem({ c, completed }: { c: CaseListRow; completed?: boolean }) {
  const meta = [
    c.industry,
    c.case_type.replace('_', ' '),
    c.source ?? 'unknown',
  ].filter(Boolean);
  return (
    <CaseListLink
      href={`/solve/${c.id}`}
      // Wave C: HUPR-flavor — italic Instrument Serif title, wider
      // tracked metadata (Anthropic 0.22em), v2 sketchy DNA via
      // case-row class hover (defined in globals.css).
      className="case-row block py-6 px-2 group"
      style={{
        borderBottom: '1px solid var(--color-border)',
        opacity: completed ? 0.55 : 1,
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3
            className="font-headline italic group-hover:opacity-90"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'clamp(20px, 2.4vw, 28px)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
            }}
          >
            {c.title}
          </h3>
          <div
            className="mt-2 font-mono text-[10px] uppercase flex items-center gap-2 flex-wrap"
            style={{
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.22em',
            }}
          >
            <span>{meta.join(' · ')}</span>
            <span aria-hidden="true">·</span>
            <DifficultyDots d={c.difficulty} />
          </div>
        </div>
        {completed && (
          <span
            aria-label="Completed"
            title="You've completed this case"
            className="flex-shrink-0 font-mono text-[10px]"
            style={{
              color: 'var(--color-accent)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            ✓ done
          </span>
        )}
      </div>
    </CaseListLink>
  );
}

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

  let cases: CaseListRow[] | null = null;
  try {
    const r = await withRetry(() => {
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
    cases = (r.data ?? null) as CaseListRow[] | null;
  } catch (e) {
    console.error('[cases] main query failed:', e);
  }

  // Fetch user's completed case IDs so list rows can mark "done" in the
  // right gutter. Single query, defensive — failure degrades to no
  // checkmarks rather than crashing the page.
  let completedCaseIds = new Set<string>();
  try {
    const { data: completedSessions } = await supabase
      .from('sessions')
      .select('case_id')
      .eq('user_id', user.id)
      .eq('status', 'completed');
    completedCaseIds = new Set(
      (completedSessions ?? []).map((s) => s.case_id as string).filter(Boolean)
    );
  } catch (e) {
    console.warn('[cases] completed-sessions lookup failed:', e);
  }

  const allRows = (cases ?? []) as CaseListRow[];
  const isFullLength = (r: CaseListRow) =>
    r.problem_statement != null && r.problem_statement.length >= MIN_PROBLEM_STATEMENT_LEN;
  const fullLength = allRows.filter(isFullLength);
  const shortCount = allRows.length - fullLength.length;
  const visibleRows = showAll ? allRows : fullLength;

  const showFeatured = !hasFilters && activeTrack === 'consulting';
  const { data: starterRows } = showFeatured
    ? await withRetry(() =>
        supabase
          .from('cases')
          .select('id,title,industry,case_type,difficulty,source,problem_statement')
          .in('id', STARTER_CASE_IDS)
      )
    : { data: null };
  const starterById = new Map<string, CaseListRow>(
    (starterRows ?? []).map((r) => [r.id, r as CaseListRow])
  );
  const orderedStarters: CaseListRow[] = showFeatured
    ? STARTER_CASE_IDS.map((id) => starterById.get(id)).filter(
        (r): r is CaseListRow => Boolean(r)
      )
    : [];

  // Hero = first starter; Cohort Five rail = next 5.
  const heroCase = orderedStarters[0];
  const cohortFive = orderedStarters.slice(1, 7);

  const starterIdSet = new Set(orderedStarters.map((r) => r.id));
  const mainRows = showFeatured
    ? visibleRows.filter((r) => !starterIdSet.has(r.id))
    : visibleRows;

  const isNonConsulting = activeTrack !== 'consulting';
  // Track-scoped total — used for the sparse banner AND the "Showing X of N"
  // counter under the load-more button. We always need the count now (not
  // just for non-consulting tracks) so the counter is accurate per track.
  const trackTotal =
    (await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .contains('tracks', [activeTrack])).count ?? 0;
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

  // Hero excerpt — trim problem statement to ~240 chars for the editorial card.
  const heroExcerpt = heroCase?.problem_statement
    ? heroCase.problem_statement.length > 240
      ? heroCase.problem_statement.slice(0, 237).trimEnd() + '…'
      : heroCase.problem_statement
    : '';

  return (
    <main
      className="relative min-h-screen px-6 py-8 sm:px-12 sm:py-12 max-w-6xl mx-auto"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {/* Register 'cases' preset on the persistent canvas — flies the
          asterisk from signin-center to upper-left at 35% scale. */}
      <AsteriskSceneRegister preset="cases" />
      <header className="mb-10 sm:mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="meta-label mb-2">
            Track · {TRACKS[activeTrack].label}
          </p>
          <h1
            className="font-headline italic"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'clamp(48px, 8vw, 112px)',
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
              margin: 0,
              maxWidth: '14ch',
            }}
          >
            The library.
          </h1>
        </div>
        <TutorialLaunchLink className="text-xs sm:text-sm hover:opacity-80 text-[color:var(--color-accent)]">
          Take me through a case →
        </TutorialLaunchLink>
      </header>

      {/* HERO — single editorial card for the first starter. */}
      {showFeatured && heroCase && (
        <section className="mb-10">
          <CasesHero
            caseId={heroCase.id}
            source={heroCase.source ?? 'CASEBOOK'}
            title={heroCase.title}
            excerpt={heroExcerpt}
            caseTypeLabel={heroCase.case_type.replace('_', ' ')}
            difficulty={heroCase.difficulty}
          />
        </section>
      )}

      {/* THE COHORT FIVE — horizontal scroll rail. */}
      {showFeatured && cohortFive.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline gap-3 mb-4">
            <h2
              className="font-mono text-[11px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              The Cohort Five
            </h2>
            <span
              className="flex-1 h-px"
              style={{ background: 'var(--color-border)' }}
              aria-hidden="true"
            />
          </div>
          <CohortRail
            cards={cohortFive.map((c) => ({
              id: c.id,
              title: c.title,
              source: c.source,
              case_type: c.case_type,
              difficulty: c.difficulty,
            }))}
          />
        </section>
      )}
      {/* Track tabs — underline style, no pills. */}
      <div data-tour="cases-track" className="flex gap-6 mb-6 overflow-x-auto">
        {(['consulting', 'ib_pe_vc', 'pm', 'marketing', 'strategy_bizops'] as Track[]).map((t) => {
          const isActive = activeTrack === t;
          return (
            <a
              key={t}
              href={`/cases?track=${t}`}
              className="font-mono text-[11px] uppercase tracking-[0.16em] pb-2 whitespace-nowrap"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: isActive
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              {TRACKS[t].short}
            </a>
          );
        })}
      </div>
      <div data-tour="cases-filters">
        <CaseFilters />
      </div>

      {isSparse && (
        <div
          className="mb-6 rounded-md border p-4 text-sm"
          style={{
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent-bright)',
          }}
        >
          <div className="font-medium mb-1">Sparse track</div>
          <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Only {trackTotal} {TRACKS[activeTrack].short} case{trackTotal === 1 ? '' : 's'} in the library so far —
            we&apos;re also showing the broader consulting library below.
          </p>
        </div>
      )}

      {/* THE LIBRARY — list-mode by default. */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <h2
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            The Library
          </h2>
          <span
            className="flex-1 h-px"
            style={{ background: 'var(--color-border)' }}
            aria-hidden="true"
          />
          <span
            className="meta-label"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {trackTotal.toLocaleString()} total
          </span>
        </div>
        <CasesLoadMore totalLibrarySize={trackTotal}>
          {mainRows.map((c, i) => (
            <div key={c.id} data-tour={i === 0 && !showFeatured ? 'cases-card' : undefined}>
              {/* Section divider every 6 rows — gives the eye a breath
                  point on the long library list. NYT Cooking pattern.
                  Skipped at i=0 (no leading rest beat). */}
              {i > 0 && i % 6 === 0 && (
                <div className="case-section-rest" aria-hidden="true" />
              )}
              <CaseListRowItem c={c} completed={completedCaseIds.has(c.id)} />
            </div>
          ))}
        </CasesLoadMore>
      </section>

      {!showAll && shortCount > 0 && (
        <div
          className="mt-6 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {shortCount} case{shortCount === 1 ? '' : 's'} hidden because the prompt is incomplete.{' '}
          <a
            href={toggleHref}
            className="underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Show all 1,165 cases (including short prompts)
          </a>
        </div>
      )}
      {showAll && (
        <div
          className="mt-6 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Showing all cases including short / partial prompts.{' '}
          <a
            href={toggleHref}
            className="underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Hide short prompts
          </a>
        </div>
      )}

      {isSparse && fallbackFiltered.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline gap-3 mb-3">
            <h2
              className="font-mono text-[11px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Cases from other tracks
            </h2>
            <span
              className="flex-1 h-px"
              style={{ background: 'var(--color-border)' }}
              aria-hidden="true"
            />
          </div>
          <p
            className="text-xs mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Drawn from the consulting library while {TRACKS[activeTrack].short} backfill catches up.
          </p>
          <div>
            {fallbackFiltered.map((c) => (
              <div key={c.id}>
                <CaseListRowItem c={c} completed={completedCaseIds.has(c.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {mainRows.length === 0 && orderedStarters.length === 0 && fallbackFiltered.length === 0 && (
        <div
          className="text-sm mt-12"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No cases match these filters.
        </div>
      )}

      <CasesTour />

      {/* Wave C HUPR-flavor bottom marquee */}
      <HuprMarquee text="The archive is the work." />
    </main>
  );
}
