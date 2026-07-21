import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ScoreBar } from '@/components/score-bar';
import { ScoreReveal } from '@/components/score-reveal';
import { TRACKS } from '@/lib/tracks';
import { CompletionBanner } from '@/components/completion-banner';
import { totalXp } from '@/lib/xp-heuristics';
import { streakDaysFromTimestamps } from '@/lib/streak-copy';
import { IdealWalkthroughLoader } from '@/components/ideal-walkthrough-loader';
import { WALKTHROUGH_GENERATOR_VERSION } from '@/lib/groq/walkthrough';
import { SessionFeedbackForm } from '@/components/session-feedback-form';
import { DebriefFeedbackModal } from '@/components/debrief-feedback-modal';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import type { Track } from '@/lib/tracks';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';

// Hardcoded transition lines case_type → case_type. The today→tomorrow connection
// is the editorial moment that makes the journey feel deliberate. We keep these
// generic-but-grounded; never fabricate prior-session-specific details.
const TRANSITION_LINES: Record<string, string> = {
  market_sizing:
    'Today you held structure under estimation. Tomorrow we add quant under M&A pressure.',
  profitability:
    'Today was profitability. Tomorrow we shift the lens to growth — same rigor, new angle.',
  market_entry:
    'Today was market entry. Tomorrow tests whether your hypothesis discipline holds under pricing.',
  pricing:
    'Today was pricing. Tomorrow stretches the same instinct across a broader strategy call.',
  ma:
    'Today was M&A. Tomorrow drops you into operations — softer numbers, sharper judgement.',
  operations:
    'Today was operations. Tomorrow zooms back out — strategy framing under time pressure.',
  growth:
    'Today was growth. Tomorrow we pressure-test it with a profitability question.',
  product:
    'Today was a product call. Tomorrow we test the same instincts inside a numbers-heavy case.',
  marketing:
    'Today was a marketing call. Tomorrow brings a different lens — same depth, new ground.',
  other:
    'Today was a rep. Tomorrow we line up the next angle.',
};

function pickTransitionLine(tomorrowType: string | null): string {
  if (!tomorrowType) return 'Tomorrow we line up the next case for you.';
  return TRANSITION_LINES[tomorrowType] ?? TRANSITION_LINES.other;
}

export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    const r = await supabase.auth.getUser();
    user = r.data.user;
  } catch (e) {
    console.error('[debrief] auth.getUser failed:', e);
  }
  let session: any = null;
  try {
    const r = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    session = r.data;
  } catch (e) {
    console.error('[debrief] sessions fetch failed:', e);
  }
  if (!session) redirect('/cases');
  // Live-interview (0019_live_interview.sql): case_id is nullable — a
  // caseless (behavioral/culture-fit) session has no case row at all. Skip
  // the query entirely rather than let it 0-row-error; caseRow stays null,
  // which every render path below already treats as "no case" gracefully
  // (title falls back to em-dash, walkthrough section is hidden further down).
  let caseRow: any = null;
  if (session.case_id) {
    try {
      const r = await supabase
        .from('cases')
        .select('id, title, case_type, ideal_structure, problem_statement, interviewer_notes, ideal_walkthrough')
        .eq('id', session.case_id)
        .single();
      caseRow = r.data;
    } catch (e) {
      console.error('[debrief] cases fetch failed:', e);
    }
  }

  // TOMORROW'S CASE — graceful degrade if migration 0011 missing or no user.
  // assignDailyCase is idempotent per (user_id, today). It returns today's
  // assignment, not literally "tomorrow's", but in the journey UX what we mean
  // is "the next case lined up for you". For users who have already completed
  // today's assignment, the picker will roll a fresh one when they revisit
  // tomorrow — no need for a real "tomorrow" lookup.
  const preferredTrack =
    user?.user_metadata?.preferred_track as Track | undefined;
  // Defensive: try/catch wraps a possible SYNCHRONOUS throw inside
  // assignDailyCase. .catch() alone wouldn't trap one (it lands before the
  // promise is even created).
  const tomorrowAssignment = user
    ? await (async () => {
        try {
          return await assignDailyCase(user.id, preferredTrack ?? null);
        } catch (e) {
          console.warn('[debrief] tomorrow assign failed:', e);
          return null;
        }
      })()
    : null;

  // Walkthrough is generated CLIENT-SIDE via /api/walkthrough so a 60-95s LLM
  // generation never blocks (or times out) the page render. Here we only read
  // the cache + whether it's current; <IdealWalkthroughLoader> fetches or
  // regenerates as needed after the page paints.
  const cachedWalkthrough = (caseRow?.ideal_walkthrough as any) ?? null;
  const walkthroughFresh =
    !!cachedWalkthrough && (cachedWalkthrough.generator_version ?? 1) >= WALKTHROUGH_GENERATOR_VERSION;

  // Defensive double-gate alongside localStorage: if a feedback row already
  // exists for this session, suppress the modal even on a fresh device. Uses
  // .maybeSingle() so a 0-row response is null, not an error. Wrap in try
  // catch — a Supabase auth/RLS surprise here previously crashed the page.
  let feedbackAlreadyGiven = false;
  try {
    const { data: existingFeedback } = await supabase
      .from('session_feedback')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();
    feedbackAlreadyGiven = !!existingFeedback;
  } catch (e) {
    console.warn('[debrief] session_feedback lookup failed:', e);
  }

  const b = (session.score_breakdown ?? {}) as any;
  const usedFallback = b?.fallback_used === true;

  // Wave 2: render the REAL per-track rubric dimensions (was hardcoded to the
  // legacy Structure/Insight/Speed, which showed 0s for every track session).
  // track-v2 breakdowns carry `track` + `scheme`; legacy rows fall back.
  const trackDef =
    b?.scheme === 'track-v2' && b?.track && TRACKS[b.track as Track]
      ? TRACKS[b.track as Track]
      : null;
  const dimKey = (d: string) => d.toLowerCase().replace(/\s+/g, '_');
  const scoreDims = trackDef
    ? trackDef.rubric.map((r) => ({ label: r.dimension, value: Number(b[dimKey(r.dimension)] ?? 0), max: r.weight }))
    : [
        { label: 'Structure', value: Number(b.structure ?? 0), max: 40 },
        { label: 'Insight', value: Number(b.insight ?? 0), max: 40 },
        { label: 'Speed', value: Number(b.speed ?? 0), max: 20 },
      ];
  const verdict: string | null = typeof b?.verdict === 'string' ? b.verdict : null;
  const below3: string[] = Array.isArray(b?.below_3_flags) ? b.below_3_flags : [];
  const VERDICT_META: Record<string, { label: string; color: string }> = {
    strong: { label: 'Strong — offer-level', color: 'var(--color-accent-bright, var(--color-accent))' },
    pass: { label: 'Pass', color: 'var(--color-accent)' },
    reject: { label: 'Below bar', color: 'var(--color-signal-danger)' },
  };

  // COMPLETION-BANNER DATA — XP from this session's transcript + streak +
  // total cases done. All single-shot queries; failures degrade silently
  // (banner shows zeros rather than crashing the page).
  let xpEarned = 0;
  try {
    const t = Array.isArray(session.transcript) ? session.transcript : [];
    xpEarned = totalXp(t);
  } catch (e) {
    console.warn('[debrief] xp compute failed:', e);
  }
  let streakDays = 0;
  let totalCompleted = 0;
  let isNewRecord = false;
  if (user?.id) {
    try {
      const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const r = await supabase
        .from('sessions')
        .select('ended_at, started_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('started_at', sinceIso);
      const rows = (r.data ?? []) as Array<{ ended_at: string | null; started_at: string }>;
      totalCompleted = rows.length;
      const stamps = rows.map((row) => row.ended_at || row.started_at).filter(Boolean) as string[];
      streakDays = streakDaysFromTimestamps(stamps);
      // Personal record requires a streak ledger; skipped for now. The
      // headline copy still picks a sensible line without the flag.
      isNewRecord = false;
    } catch (e) {
      console.warn('[debrief] streak fetch failed:', e);
    }
  }
  const walkthroughFallback = (cachedWalkthrough as any)?.fallback_used === true;

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <HuprObserveReveals />

      {/* HEADER BAND — cognac. Sets debrief tone. */}
      <section
        className="px-6 sm:px-12 py-12"
        style={{ background: 'var(--hupr-cognac)', color: '#FFFFFF' }}
      >
        <div className="max-w-4xl mx-auto">
          <a
            href="/dashboard"
            className="hupr-mono-eyebrow underline"
            style={{ color: '#FFFFFF' }}
          >
            ← back to dashboard
          </a>
          <div className="mt-6">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>Debrief</span>
            <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0' }} />
          </div>
          <h1
            className="uppercase mt-6 mb-2"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 64px)',
              lineHeight: 1,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '24ch',
            }}
          >
            {caseRow?.title ?? '—'}
          </h1>
        </div>
      </section>

      <div className="p-6 sm:p-12 max-w-4xl mx-auto">
      <CompletionBanner
        xpEarned={xpEarned}
        streakDays={streakDays}
        totalCompleted={totalCompleted}
        isNewRecord={isNewRecord}
      />
      <ScoreReveal score={session.score ?? 0} outOf={100} />

      {verdict && VERDICT_META[verdict] && !usedFallback && (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              padding: '4px 10px',
              borderRadius: 3,
              border: `1px solid ${VERDICT_META[verdict].color}`,
              color: VERDICT_META[verdict].color,
            }}
          >
            {VERDICT_META[verdict].label}
          </span>
          {verdict === 'reject' && below3.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
              below the bar on: {below3.join(', ')}
            </span>
          )}
        </div>
      )}

      {(usedFallback || walkthroughFallback) && (
        <div
          className="mb-6 p-3 mt-6"
          style={{
            border: '1px solid var(--color-signal-danger)',
            background: 'var(--color-bg-sunken)',
            color: 'var(--color-signal-danger)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          ⚠ {usedFallback && walkthroughFallback ? 'Scoring AND walkthrough services were temporarily down' : usedFallback ? 'The scoring service was temporarily down' : 'The walkthrough service was temporarily down'} when you ended this session — what you see below is a generic placeholder. Re-run the case to get the real score. Your transcript + tree are saved.
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-6 mb-8 mt-8">
        <div className="space-y-3">
          {scoreDims.map((d, i) => (
            <ScoreBar
              key={d.label}
              label={d.label}
              value={d.value}
              max={d.max}
              staggerIndex={i}
              startDelay={1.2}
            />
          ))}
        </div>
        <div className="space-y-6">
          <div>
            <span className="hupr-mono-eyebrow">Strengths</span>
            <hr className="hupr-hairline" />
            <ul
              className="mt-3 space-y-1.5"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
              }}
            >
              {(b.strengths ?? []).map((s: string, i: number) => <li key={i}>· {s}</li>)}
            </ul>
          </div>
          <div>
            <span className="hupr-mono-eyebrow">Gaps</span>
            <hr className="hupr-hairline" />
            <ul
              className="mt-3 space-y-1.5"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
              }}
            >
              {(b.gaps ?? []).map((g: string, i: number) => <li key={i}>· {g}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* The stale casebook ideal_structure box (often mislabeled, e.g. "Porter's
          5 Forces" on a profit case) is gone — the walkthrough's correct,
          case-type-anchored issue tree below replaces it. The walkthrough is
          loaded/regenerated client-side so this page never blocks on the LLM.
          Case-structural by definition (issue tree / hypothesis tree) — no
          meaning for a caseless (behavioral/culture-fit) session, so hidden
          when there's no case row rather than shown empty/broken. */}
      {caseRow && (
        <section className="p-6 mb-8" style={{ border: '1px solid var(--color-border)' }}>
          <span className="hupr-mono-eyebrow">How a top candidate would solve this</span>
          <hr className="hupr-hairline" />
          <p
            className="mt-3 mb-5"
            style={{
              fontFamily: 'var(--font-accent)',
              fontSize: 14,
              color: 'var(--color-text-muted)',
            }}
          >
            Issue tree, hypothesis tree, and L0–L4 thinking depth — the ideal walkthrough.
          </p>
          <IdealWalkthroughLoader
            sessionId={sessionId}
            initial={cachedWalkthrough}
            initialFresh={walkthroughFresh}
          />
        </section>
      )}

      {/* TOMORROW — anticipation outro. Routes to /dashboard (set anticipation),
          not /cases. The library is still reachable via the secondary link below. */}
      <section
        className="-mx-6 sm:-mx-12 px-6 sm:px-12 py-10 mb-8"
        style={{
          background: 'var(--hupr-terra)',
          color: '#FFFFFF',
        }}
      >
        <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>Tomorrow’s case</span>
        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0 24px' }} />
        {tomorrowAssignment ? (
          <>
            <h3
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 48px)',
                lineHeight: 1,
                color: '#FFFFFF',
                margin: 0,
                maxWidth: '20ch',
              }}
            >
              {tomorrowAssignment.caseTitle}
            </h3>
            <div
              className="mt-3 mb-4"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {tomorrowAssignment.caseType.replace(/_/g, ' ')} · ≈{' '}
              {estimatedMinutes(tomorrowAssignment.caseDifficulty)} min
            </div>
            <p
              className="hupr-fade-up mb-6 max-w-prose"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 16,
                lineHeight: 1.55,
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              {pickTransitionLine(tomorrowAssignment.caseType)}
            </p>
          </>
        ) : (
          <p
            className="hupr-fade-up mb-6 max-w-prose"
            style={{
              fontFamily: 'var(--font-accent)',
              fontSize: 16,
              lineHeight: 1.55,
              color: '#FFFFFF',
              margin: 0,
            }}
          >
            Wander the library tomorrow — pick what calls you.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Link
            href="/dashboard"
            className="hupr-anim-btn"
            style={{
              background: '#FFFFFF',
              color: 'var(--hupr-terra)',
              padding: '12px 18px',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Set anticipation →
          </Link>
          <Link
            href="/cases"
            className="hupr-mono-eyebrow underline"
            style={{ color: '#FFFFFF' }}
          >
            Or keep going now →
          </Link>
        </div>
      </section>

      <SessionFeedbackForm sessionId={sessionId} />

      <DebriefFeedbackModal
        sessionId={sessionId}
        initiallyDismissed={feedbackAlreadyGiven}
      />
      </div>
    </main>
  );
}
