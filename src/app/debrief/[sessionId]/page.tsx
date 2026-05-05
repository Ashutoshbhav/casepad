import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ScoreBar } from '@/components/score-bar';
import { ScoreReveal } from '@/components/score-reveal';
import { CompletionBanner } from '@/components/completion-banner';
import { totalXp } from '@/lib/xp-heuristics';
import { streakDaysFromTimestamps } from '@/lib/streak-copy';
import { IdealStructureTree } from '@/components/ideal-structure-tree';
import { IdealWalkthroughView } from '@/components/ideal-walkthrough';
import { generateIdealWalkthrough } from '@/lib/groq/walkthrough';
import { SessionFeedbackForm } from '@/components/session-feedback-form';
import { DebriefFeedbackModal } from '@/components/debrief-feedback-modal';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import type { Track } from '@/lib/tracks';

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
  let caseRow: any = null;
  try {
    const r = await supabase
      .from('cases')
      .select('id, title, ideal_structure, problem_statement, interviewer_notes, ideal_walkthrough')
      .eq('id', session.case_id)
      .single();
    caseRow = r.data;
  } catch (e) {
    console.error('[debrief] cases fetch failed:', e);
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

  // Lazy-generate the ideal walkthrough on first debrief view, then cache.
  let walkthrough = caseRow?.ideal_walkthrough as any;
  if (caseRow && !walkthrough) {
    try {
      walkthrough = await generateIdealWalkthrough(
        caseRow.title,
        caseRow.problem_statement || '',
        caseRow.ideal_structure || {},
        (caseRow.interviewer_notes as any[]) || []
      );
      if (walkthrough) {
        try {
          const admin = createSupabaseAdminClient();
          await admin.from('cases').update({ ideal_walkthrough: walkthrough }).eq('id', caseRow.id);
        } catch (e) {
          console.warn('[debrief] walkthrough cache write failed:', e);
        }
      }
    } catch (e) {
      console.warn('[debrief] generateIdealWalkthrough failed:', e);
      walkthrough = null;
    }
  }

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
  const walkthroughFallback = (walkthrough as any)?.fallback_used === true;

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <a
        href="/dashboard"
        className="text-sm hover:opacity-80"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← back to dashboard
      </a>
      <h1
        className="font-headline text-2xl sm:text-3xl mt-2 mb-1"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {caseRow?.title ?? '—'}
      </h1>
      <p
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Your debrief
      </p>
      <CompletionBanner
        xpEarned={xpEarned}
        streakDays={streakDays}
        totalCompleted={totalCompleted}
        isNewRecord={isNewRecord}
      />
      <ScoreReveal score={session.score ?? 0} outOf={100} />

      {(usedFallback || walkthroughFallback) && (
        <div className="mb-6 rounded border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200">
          ⚠ {usedFallback && walkthroughFallback ? 'Scoring AND walkthrough services were temporarily down' : usedFallback ? 'The scoring service was temporarily down' : 'The walkthrough service was temporarily down'} when you ended this session — what you see below is a generic placeholder. Re-run the case to get the real score. Your transcript + tree are saved.
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-6 mb-8 mt-8">
        <div className="space-y-3">
          <ScoreBar
            label="Structure"
            value={b.structure ?? 0}
            max={40}
            staggerIndex={0}
            startDelay={1.2}
          />
          <ScoreBar
            label="Insight"
            value={b.insight ?? 0}
            max={40}
            staggerIndex={1}
            startDelay={1.2}
          />
          <ScoreBar
            label="Speed"
            value={b.speed ?? 0}
            max={20}
            staggerIndex={2}
            startDelay={1.2}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Strengths</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.strengths ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Gaps</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.gaps ?? []).map((g: string, i: number) => <li key={i}>• {g}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 p-5 mb-8">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Ideal structure</h3>
        <IdealStructureTree s={(caseRow?.ideal_structure ?? {}) as any} />
      </section>

      {walkthrough && (
        <section className="rounded border border-zinc-800 p-5 mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">How a top candidate would solve this</h2>
          <p className="text-xs text-zinc-500 mb-5">Issue tree, hypothesis tree, and L0–L4 thinking depth — the ideal walkthrough.</p>
          <IdealWalkthroughView w={walkthrough} />
        </section>
      )}

      {/* TOMORROW — anticipation outro. Routes to /dashboard (set anticipation),
          not /cases. The library is still reachable via the secondary link below. */}
      <section
        className="rounded-lg p-5 sm:p-6 mb-8 max-w-[64%]"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="mb-3">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.18em] inline-block pb-1"
            style={{
              color: 'var(--color-accent-bright)',
              borderBottom: '1.5px solid var(--color-accent)',
            }}
          >
            TOMORROW’S CASE
          </div>
        </div>
        {tomorrowAssignment ? (
          <>
            <h3
              className="font-headline italic text-2xl sm:text-3xl leading-tight tracking-tight mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {tomorrowAssignment.caseTitle}
            </h3>
            <div
              className="font-mono text-[10px] uppercase tracking-[0.18em] mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {tomorrowAssignment.caseType.replace(/_/g, ' ').toUpperCase()} · ≈{' '}
              {estimatedMinutes(tomorrowAssignment.caseDifficulty)} MIN
            </div>
            <p
              className="font-headline italic text-[16px] leading-snug mb-5 max-w-prose"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {pickTransitionLine(tomorrowAssignment.caseType)}
            </p>
          </>
        ) : (
          <p
            className="font-headline italic text-[16px] leading-snug mb-5 max-w-prose"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Wander the library tomorrow — pick what calls you.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
            }}
          >
            Set anticipation →
          </Link>
          <Link
            href="/cases"
            className="font-mono text-[11px] uppercase tracking-[0.18em] hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
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
    </main>
  );
}
