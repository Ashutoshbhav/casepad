import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { CaseFilters } from '@/components/case-filters';
import { CaseSearch } from '@/components/case-search';
import { CasesTour } from '@/components/cases-tour';
import { TutorialLaunchLink } from '@/components/tutorial-launch-link';
import { CasesLoadMore } from '@/components/cases-load-more';
import { TRACKS, type Track } from '@/lib/tracks';
import { STARTER_CASE_IDS } from '@/lib/starter-cases';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';
import { HuprCaseRow, type HuprCaseRowData } from '@/components/hupr/hupr-case-row';
import { HuprStickyCard, HuprStickyCardStack } from '@/components/hupr/hupr-sticky-card';
import { caseImageFor } from '@/lib/case-images/picker';

export const dynamic = 'force-dynamic';

const MIN_PROBLEM_STATEMENT_LEN = 80;
const SPARSE_TRACK_THRESHOLD = 50;

type CaseListRow = HuprCaseRowData;

// Track → glyph for the sticky pill row. Visual glance signal.
const TRACK_ICONS: Partial<Record<Track, string>> = {
  consulting: '◆',
  ib_pe_vc: '$',
  pm: '▲',
  marketing: '✱',
  strategy_bizops: '◇',
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

  let cases: CaseListRow[] | null = null;
  let usedStaticFallback = false;
  try {
    const r = await withRetry(() => {
      let query = supabase
        .from('cases')
        .select('id,title,industry,case_type,difficulty,source,problem_statement')
        .contains('tracks', [activeTrack])
        // Cohort listing must NEVER include user-submitted (BYOC) rows —
        // those are private to their owner. is_user_case defaults to false
        // for all rows ingested before migration 0015, so this filter is a
        // no-op until BYOC traffic exists, but is required for correctness.
        .eq('is_user_case', false)
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

  // P1-10 from never-fail audit: if Supabase is fully down (cases is null AND
  // no filters were active that would legitimately return zero results), fall
  // back to the 4 starter cases hardcoded in src/lib/starter-cases. The user
  // can still start a session — degraded library, but NSM works.
  if ((cases === null || (cases.length === 0 && !hasFilters)) && !sp.q) {
    const { STATIC_FALLBACK_CASES } = await import('@/lib/starter-cases');
    if (cases === null) {
      console.warn('[cases] using STATIC_FALLBACK_CASES — Supabase query path failed');
      cases = STATIC_FALLBACK_CASES as unknown as CaseListRow[];
      usedStaticFallback = true;
    }
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

  // Featured = first starter case for the consulting track when no filters
  // are active. Cohort Five rail removed — starter pool now feeds only the
  // hero, the rest get folded into the main library list.
  const showFeatured = !hasFilters && activeTrack === 'consulting';
  const { data: starterRows } = showFeatured
    ? await withRetry(() =>
        supabase
          .from('cases')
          .select('id,title,industry,case_type,difficulty,source,problem_statement')
          .in('id', STARTER_CASE_IDS.slice(0, 1))
      )
    : { data: null };
  const heroCase = (starterRows?.[0] ?? null) as CaseListRow | null;

  const heroIdSet = new Set(heroCase ? [heroCase.id] : []);
  const mainRows = visibleRows.filter((r) => !heroIdSet.has(r.id));

  const isNonConsulting = activeTrack !== 'consulting';
  const trackTotal =
    (await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .contains('tracks', [activeTrack])
      .eq('is_user_case', false)).count ?? 0;
  const isSparse = isNonConsulting && trackTotal < SPARSE_TRACK_THRESHOLD;
  const { data: fallbackRows } = isSparse
    ? await withRetry(() => {
        let q = supabase
          .from('cases')
          .select('id,title,industry,case_type,difficulty,source,problem_statement')
          .contains('tracks', ['consulting'])
          .eq('is_user_case', false)
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

      {/* HERO — cognac band, full-bleed photo + floating featured-case card */}
      {showFeatured && heroCase ? (
        <section
          className="relative w-full overflow-hidden"
          style={{
            height: 'min(72vh, 640px)',
            minHeight: 480,
            background: 'var(--hupr-cognac)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              // Hero photo for the featured case — uses the per-case picker.
              // If the generated webp doesn't exist yet, the underlying
              // cognac band (parent section background) shows through. CSS
              // background-image comma-syntax LAYERS, not falls back, so we
              // only specify one URL.
              backgroundImage: `url(${caseImageFor(heroCase.id)})`,
              backgroundSize: 'cover',
              backgroundPosition: '50% 50%',
              filter: 'brightness(0.72) saturate(0.88)',
              opacity: 0.85,
              mixBlendMode: 'multiply',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(50,50,52,0.32) 0%, rgba(50,50,52,0.08) 35%, rgba(50,50,52,0.0) 65%, rgba(50,50,52,0.50) 100%)',
            }}
          />

          <header className="absolute top-0 left-0 right-0 z-10 flex items-baseline justify-between px-6 sm:px-12 py-6 sm:py-8 gap-3">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
              Cases · {TRACKS[activeTrack].label}
            </span>
            <div className="flex items-baseline gap-5">
              {/* BYOC entry — solves "I want to drill X but it's not in the
                  library" without diluting the cohort listing. Custom cases
                  stay private to the user (RLS + is_user_case filter). */}
              <a
                href="/cases/new"
                className="hupr-mono-eyebrow underline"
                style={{ color: '#FFFFFF' }}
              >
                + Bring your own case
              </a>
              <TutorialLaunchLink className="hupr-mono-eyebrow underline">
                <span style={{ color: '#FFFFFF' }}>Take me through a case →</span>
              </TutorialLaunchLink>
            </div>
          </header>

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
              <span className="hupr-mono-eyebrow" style={{ color: '#323234' }}>
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
                  Solve this case
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        // Non-featured header (track filter active or non-consulting track) —
        // cream band so the page isn't a wall of white.
        <header
          className="px-6 sm:px-12 pt-12 pb-10"
          style={{ background: 'var(--hupr-cream)' }}
        >
          <div className="max-w-6xl mx-auto">
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
              <div className="flex items-baseline gap-5">
                <a href="/cases/new" className="hupr-mono-eyebrow underline">
                  + Bring your own case
                </a>
                <TutorialLaunchLink className="hupr-mono-eyebrow underline">
                  Take me through a case →
                </TutorialLaunchLink>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* STICKY TRACK PILLS — visible while scrolling. Big, glanceable. */}
      <nav
        className="sticky top-0 z-20"
        style={{
          background: 'var(--color-bg-canvas)',
          borderBottom: '1px solid var(--color-border)',
        }}
        data-tour="cases-track"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-12 flex gap-2 overflow-x-auto py-3">
          {(['consulting', 'ib_pe_vc', 'pm', 'marketing', 'strategy_bizops'] as Track[]).map((t) => {
            const isActive = activeTrack === t;
            return (
              <a
                key={t}
                href={`/cases?track=${t}`}
                className="flex items-center gap-2.5 px-4 py-2.5 transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{
                  background: isActive ? 'var(--color-text-primary)' : 'transparent',
                  color: isActive ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--color-text-primary)' : 'var(--color-border)',
                  borderRadius: 4,
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <span style={{ fontSize: 16 }} aria-hidden>{TRACK_ICONS[t]}</span>
                {TRACKS[t].short}
              </a>
            );
          })}
        </div>
      </nav>

      {/* BROWSE BY CASE TYPE — 6 sticky stacking cards. Hidden once a
          ?type= filter is active so the user lands clean on the
          filtered library instead of seeing the same browse cards
          stacking on top of their result. Slugs match DB case_type
          enum exactly: profitability / market_entry / operations /
          estimation / pricing / mna. Whole card is a single <a> →
          /cases?type=X#library, which both filters AND scrolls past
          the cards to the library section. */}
      {!sp.type && (
      <HuprStickyCardStack>
        {[
          { type: 'profitability', label: 'Profitability', body: 'Why is profit dropping? Revenue vs cost decomposition. The classic root-cause case — most consulting first-rounds open here.', bg: 'var(--hupr-sand)' },
          { type: 'market_entry', label: 'Market entry', body: 'Should we enter this market? Sizing the opportunity, competitive read, go-to-market plan. Tests structure under ambiguity.', bg: 'var(--hupr-terra)' },
          { type: 'operations', label: 'Operations', body: 'The plant is bleeding margin. Cycle time, throughput, defect rate. Quant under operational complexity.', bg: 'var(--hupr-sage)' },
          { type: 'estimation', label: 'Estimation', body: 'How many golf balls fit on a 747? Top-down vs bottom-up sizing. Tests assumption discipline + arithmetic under pressure.', bg: 'var(--hupr-slate)' },
          { type: 'pricing', label: 'Pricing', body: 'What should the price be? Cost-plus, value-based, competitive. Segmentation + WTP estimation under time pressure.', bg: 'var(--hupr-cognac)' },
          { type: 'mna', label: 'M & A', body: 'Should we acquire? Strategic fit, valuation, integration risk, deal-breakers. Quant-heavy with judgment calls.', bg: 'var(--hupr-cream)', fg: '#323234' },
        ].map((c, idx) => (
          <HuprStickyCard
            key={c.type}
            index={idx}
            bg={c.bg}
            fg={c.fg}
            eyebrow={`0${idx + 1}`}
            title={c.label}
            body={c.body}
            href={`/cases?type=${c.type}${activeTrack !== userTrack ? `&track=${activeTrack}` : ''}#library`}
          />
        ))}
      </HuprStickyCardStack>
      )}

      <div className="px-6 sm:px-12 pt-10 pb-20 max-w-6xl mx-auto">
        {/* COLLAPSED FILTER — single line until expanded. Reduces clutter. */}
        <details data-tour="cases-filters" className="mb-10 group">
          <summary
            className="cursor-pointer flex items-center justify-between py-3 list-none"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span>Filter cases</span>
            <span className="group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="pt-4">
            <CaseFilters />
          </div>
        </details>

        {isSparse && (
          <div
            className="mb-10 p-5"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--hupr-cream)',
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

        {/* Active-filter chip — shows when ?type= is set so user can
            clearly see what's filtered + clear it. Builds the clear
            link by stripping `type` from the current querystring. */}
        {sp.type && (
          <div
            className="mb-8 flex items-center gap-3 flex-wrap"
            style={{
              padding: '14px 18px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-sunken)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
              }}
            >
              Filter
            </span>
            <span
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 18,
                textTransform: 'uppercase',
                letterSpacing: '-0.005em',
                color: 'var(--color-text-primary)',
              }}
            >
              {sp.type.replace(/_/g, ' ')}
            </span>
            <span style={{ flex: 1 }} aria-hidden="true" />
            <a
              href={(() => {
                const params = new URLSearchParams();
                if (sp.industry) params.set('industry', sp.industry);
                if (sp.difficulty) params.set('difficulty', sp.difficulty);
                if (sp.q) params.set('q', sp.q);
                if (sp.track) params.set('track', sp.track);
                const qs = params.toString();
                return qs ? `/cases?${qs}` : '/cases';
              })()}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-primary)',
                textDecoration: 'underline',
              }}
            >
              Clear ×
            </a>
          </div>
        )}

        {/* THE LIBRARY — news-pair rows. id="library" is the scroll target
            for sticky case-type card hrefs (e.g. /cases?type=profitability#library)
            so clicking a card jumps the user past the cards directly
            to the filtered list. */}
        <section id="library" className="mb-12 scroll-mt-24">
          <div className="flex items-baseline gap-3 mb-6">
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
              {(sp.type ? mainRows.length : trackTotal).toLocaleString()}{sp.type ? ` ${sp.type.replace(/_/g, ' ')}` : ' total'}
            </span>
          </div>
          <CaseSearch />
          {sp.q && (
            <div
              className="mb-6"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-text-muted)',
              }}
            >
              {mainRows.length} match{mainRows.length === 1 ? '' : 'es'} for &ldquo;{sp.q}&rdquo;
            </div>
          )}
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
              Show all cases (including short prompts)
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
          <section
            className="mt-16 -mx-6 sm:-mx-12 px-6 sm:px-12 py-12"
            style={{ background: 'var(--hupr-slate)', color: '#FFFFFF' }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-baseline gap-3 mb-6">
                <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
                  Cases from other tracks
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                  aria-hidden="true"
                />
              </div>
              <p
                className="mb-6"
                style={{
                  fontFamily: 'var(--font-accent)',
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.85)',
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
            </div>
          </section>
        )}

        {mainRows.length === 0 && !heroCase && fallbackFiltered.length === 0 && (
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
