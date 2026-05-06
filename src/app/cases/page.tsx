import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { CaseFilters } from '@/components/case-filters';
import { CasesTour } from '@/components/cases-tour';
import { TutorialLaunchLink } from '@/components/tutorial-launch-link';
import { CohortRail } from '@/components/cohort-rail';
import { CasesLoadMore } from '@/components/cases-load-more';
import { TRACKS, type Track } from '@/lib/tracks';
import { STARTER_CASE_IDS } from '@/lib/starter-cases';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';
import { HuprCaseRow, type HuprCaseRowData } from '@/components/hupr/hupr-case-row';

export const dynamic = 'force-dynamic';

const MIN_PROBLEM_STATEMENT_LEN = 80;
const SPARSE_TRACK_THRESHOLD = 50;

type CaseListRow = HuprCaseRowData;

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80';

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

  const heroCase = orderedStarters[0];
  const cohortFive = orderedStarters.slice(1, 7);

  const starterIdSet = new Set(orderedStarters.map((r) => r.id));
  const mainRows = showFeatured
    ? visibleRows.filter((r) => !starterIdSet.has(r.id))
    : visibleRows;

  const isNonConsulting = activeTrack !== 'consulting';
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

  const heroExcerpt = heroCase?.problem_statement
    ? heroCase.problem_statement.length > 280
      ? heroCase.problem_statement.slice(0, 277).trimEnd() + '…'
      : heroCase.problem_statement
    : '';

  return (
    <main
      className="relative min-h-screen"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-text-primary)' }}
    >
      <HuprObserveReveals />

      {/* HERO — full-bleed photo + floating featured-case card on right */}
      {showFeatured && heroCase ? (
        <section
          className="relative w-full overflow-hidden"
          style={{ height: 'min(80vh, 720px)', minHeight: 560 }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${HERO_PHOTO})`,
              backgroundSize: 'cover',
              backgroundPosition: '50% 50%',
              filter: 'brightness(0.78) saturate(0.92)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(50,50,52,0.40) 0%, rgba(50,50,52,0.10) 35%, rgba(50,50,52,0.0) 65%, rgba(50,50,52,0.55) 100%)',
            }}
          />
          {/* Header band over the photo */}
          <header className="absolute top-0 left-0 right-0 z-10 flex items-baseline justify-between px-6 sm:px-12 py-6 sm:py-8">
            <div>
              <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
                Cases · {TRACKS[activeTrack].label}
              </span>
            </div>
            <TutorialLaunchLink className="hupr-mono-eyebrow underline" >
              <span style={{ color: '#FFFFFF' }}>Take me through a case →</span>
            </TutorialLaunchLink>
          </header>

          {/* Floating featured-case card on right */}
          <div
            className="absolute z-10 px-6 sm:px-0"
            style={{
              top: '50%',
              right: '2rem',
              width: 'min(440px, 92vw)',
              transform: 'translateY(-50%)',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 4 }}>
              <span
                className="hupr-mono-eyebrow"
                style={{ color: '#323234' }}
              >
                Featured · {(heroCase.source ?? 'CASEBOOK').toUpperCase()}
              </span>
              <hr
                style={{
                  border: 0,
                  borderTop: '1px solid #323234',
                  margin: '8px 0 20px',
                }}
              />
              <h1
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 28,
                  lineHeight: 1.1,
                  color: '#323234',
                  margin: 0,
                }}
              >
                {heroCase.title}
              </h1>
              <div
                className="mt-3"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(50,50,52,0.65)',
                }}
              >
                {heroCase.case_type.replace('_', ' ')} · {heroCase.difficulty}
              </div>
              {heroExcerpt && (
                <p
                  className="mt-4"
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: '#323234',
                    margin: 0,
                  }}
                >
                  {heroExcerpt}
                </p>
              )}
              <div className="pt-6">
                <a
                  href={`/solve/${heroCase.id}`}
                  className="hupr-anim-btn"
                  style={{
                    display: 'inline-block',
                    background: '#323234',
                    color: '#FFFFFF',
                    padding: '12px 18px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
                  }}
                >
                  <span className="top">Solve this case</span>
                  <span className="btm">Solve this case</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        // Non-featured header (track filter active, or non-consulting track)
        <header className="px-6 sm:px-12 pt-12 pb-8 max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="hupr-mono-eyebrow">Cases</span>
              <hr className="hupr-hairline" />
              <h1
                className="uppercase mt-3"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 'clamp(40px, 6vw, 72px)',
                  lineHeight: 1,
                  margin: 0,
                  color: 'var(--color-text-primary)',
                }}
              >
                {TRACKS[activeTrack].label}
              </h1>
            </div>
            <TutorialLaunchLink className="hupr-mono-eyebrow underline">
              Take me through a case →
            </TutorialLaunchLink>
          </div>
        </header>
      )}

      <div className="px-6 sm:px-12 pt-16 max-w-6xl mx-auto">
        {/* THE COHORT FIVE — horizontal scroll rail. */}
        {showFeatured && cohortFive.length > 0 && (
          <section className="mb-16">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="hupr-mono-eyebrow">The Cohort Five</span>
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

        {/* Track tabs */}
        <div data-tour="cases-track" className="flex gap-8 mb-6 overflow-x-auto pb-1">
          {(['consulting', 'ib_pe_vc', 'pm', 'marketing', 'strategy_bizops'] as Track[]).map((t) => {
            const isActive = activeTrack === t;
            return (
              <a
                key={t}
                href={`/cases?track=${t}`}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  paddingBottom: 10,
                  whiteSpace: 'nowrap',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderBottom: isActive
                    ? '2px solid var(--color-text-primary)'
                    : '2px solid transparent',
                  textDecoration: 'none',
                }}
              >
                {TRACKS[t].short}
              </a>
            );
          })}
        </div>
        <div data-tour="cases-filters" className="mb-10">
          <CaseFilters />
        </div>

        {isSparse && (
          <div
            className="mb-10 p-5"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-sunken)',
            }}
          >
            <span className="hupr-mono-eyebrow">Sparse track</span>
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Only {trackTotal} {TRACKS[activeTrack].short} case
              {trackTotal === 1 ? '' : 's'} in the library so far — we&apos;re also
              showing the broader consulting library below.
            </p>
          </div>
        )}

        {/* THE LIBRARY — news-pair rows. */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="hupr-mono-eyebrow">The Library</span>
            <span
              className="flex-1 h-px"
              style={{ background: 'var(--color-border)' }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-text-muted)',
              }}
            >
              {trackTotal.toLocaleString()} total
            </span>
          </div>
          <CasesLoadMore totalLibrarySize={trackTotal}>
            {mainRows.map((c, i) => (
              <div key={c.id} data-tour={i === 0 && !showFeatured ? 'cases-card' : undefined}>
                {i > 0 && i % 6 === 0 && (
                  <div className="case-section-rest" aria-hidden="true" />
                )}
                <HuprCaseRow c={c} completed={completedCaseIds.has(c.id)} />
              </div>
            ))}
          </CasesLoadMore>
        </section>

        {!showAll && shortCount > 0 && (
          <div
            className="mt-8 mb-12"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            {shortCount} case{shortCount === 1 ? '' : 's'} hidden because the
            prompt is incomplete.{' '}
            <a
              href={toggleHref}
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: 'underline',
              }}
            >
              Show all 1,165 cases (including short prompts)
            </a>
          </div>
        )}
        {showAll && (
          <div
            className="mt-8 mb-12"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            Showing all cases including short / partial prompts.{' '}
            <a
              href={toggleHref}
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: 'underline',
              }}
            >
              Hide short prompts
            </a>
          </div>
        )}

        {isSparse && fallbackFiltered.length > 0 && (
          <section className="mt-16 mb-16">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="hupr-mono-eyebrow">Cases from other tracks</span>
              <span
                className="flex-1 h-px"
                style={{ background: 'var(--color-border)' }}
                aria-hidden="true"
              />
            </div>
            <p
              className="mb-4"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 14,
                color: 'var(--color-text-muted)',
              }}
            >
              Drawn from the consulting library while {TRACKS[activeTrack].short}{' '}
              backfill catches up.
            </p>
            <div>
              {fallbackFiltered.map((c) => (
                <div key={c.id}>
                  <HuprCaseRow c={c} completed={completedCaseIds.has(c.id)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {mainRows.length === 0 && orderedStarters.length === 0 && fallbackFiltered.length === 0 && (
          <div
            className="mt-16 mb-16"
            style={{
              fontFamily: 'var(--font-accent)',
              fontSize: 16,
              color: 'var(--color-text-muted)',
            }}
          >
            No cases match these filters.
          </div>
        )}

        <CasesTour />
      </div>
    </main>
  );
}
