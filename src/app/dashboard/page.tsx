import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { ScoreCurve } from '@/components/score-curve';
import { TRACK_LIST, TRACKS, type Track } from '@/lib/tracks';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';
import { OutcomeNudgeCard } from '@/components/outcome-nudge-card';
import { isMissingTable } from '@/lib/supabase/missing-table';

export const dynamic = 'force-dynamic';

// Dashboard = the journey home, not a stats wall.
// Layout (top to bottom):
//   A. Hero band (Day X, contextual greeting, library escape link)
//   B. Today's case card (the centerpiece)
//   C. The Week (7-cell rhythm grid)
//   D. Recent debriefs (3 most recent completed sessions)
//   E. Resume in-progress + Score curve + Weak spots (existing — reordered)
//   F. Library escape hatch ("Wander the library")

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

// Days-since-signup as the journey "Day X" eyebrow. We use auth.users.created_at
// (already on the session.user object). Day 1 = same calendar day as signup.
function daysSinceSignup(createdAt: string | null | undefined): number {
  if (!createdAt) return 1;
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

// Pick a contextual greeting based on (a) whether they have any sessions yet,
// (b) when the last one was, (c) time of day. Hardcoded canned options — no LLM
// call. Tone is warm but not cheesy. NEVER references a session that doesn't
// exist; first-rep users get the "first case, first rep" line.
function pickGreeting(args: {
  hasAnySessions: boolean;
  lastSessionStartedAt: string | null;
  daysSinceLast: number | null;
}): string {
  if (!args.hasAnySessions) return 'First case, first rep — let’s go.';
  if (args.daysSinceLast !== null && args.daysSinceLast >= 3) {
    return `It’s been ${args.daysSinceLast} days. Let’s get back to it.`;
  }
  const hour = new Date().getHours();
  if (hour < 5) return 'Late hours — one rep before bed.';
  if (hour < 12) return 'Morning. Ready when you are.';
  if (hour < 17) return 'Welcome back. Let’s rehearse.';
  if (hour < 22) return 'Evening rep — let’s sharpen.';
  return 'One more rep before the day folds.';
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { supabase, user } = await requireUser();

  const sp = await searchParams;
  const validTracks = TRACK_LIST as readonly string[];
  const trackFilter: Track | null = sp.track && validTracks.includes(sp.track) ? (sp.track as Track) : null;

  // Anticipation Hook: get / create today's daily assignment. Run in parallel
  // with the sessions read below — neither depends on the other. Gracefully
  // degrades to null if migration 0011 hasn't been applied yet.
  const preferredTrack = (user.user_metadata?.preferred_track as Track | undefined) ?? null;
  // Wrap in async IIFE + try/catch so a SYNCHRONOUS throw inside
  // assignDailyCase (e.g. missing SUPABASE_SERVICE_ROLE_KEY) is caught here,
  // not bubbled up into the page render. .catch() alone wouldn't catch a
  // sync throw before the function returns its promise.
  const dailyAssignmentPromise: Promise<Awaited<ReturnType<typeof assignDailyCase>>> = (async () => {
    try {
      return await assignDailyCase(user.id, preferredTrack);
    } catch (e) {
      console.warn('[dashboard] assignDailyCase failed:', e);
      return null;
    }
  })();

  // Auto-expire stuck in_progress sessions + read all sessions in parallel.
  // Each branch is independently try/caught so a single fetch hiccup never
  // crashes the whole dashboard render.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const expirePromise = (async () => {
    try {
      await supabase
        .from('sessions')
        .update({ status: 'abandoned' })
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .lt('started_at', cutoff);
    } catch (e) {
      console.warn('[dashboard] auto-expire failed:', e);
    }
  })();
  const sessionsListPromise = (async () => {
    try {
      const r = await withRetry(() =>
        supabase
          .from('sessions')
          .select('id, started_at, ended_at, score, case_id, status, track, cases(title, case_type)')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(200)
      );
      return { data: r.data };
    } catch (e) {
      console.error('[dashboard] sessions list fetch failed:', e);
      return { data: null };
    }
  })();
  // Outcome-nudge eligibility read. Independent of everything above, so it
  // belongs in the same Promise.all (the file's documented convention) — not
  // a serial blocking await. withRetry never throws; we inspect `error` and
  // treat the expected "table not created yet" (42P01) as silent fail-open,
  // surfacing anything else like the sibling branches do.
  const recentOutcomePromise = (async (): Promise<boolean> => {
    try {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await withRetry(() =>
        supabase
          .from('interview_outcomes')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', since)
          .limit(1)
      );
      if (error) {
        if (!isMissingTable(error)) {
          console.warn('[dashboard] recent-outcome fetch failed:', error);
        }
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    } catch (e) {
      console.warn('[dashboard] recent-outcome fetch threw:', e);
      return false;
    }
  })();
  const [, { data: allSessions }, dailyAssignment, hasRecentOutcome] =
    await Promise.all([
      expirePromise,
      sessionsListPromise,
      dailyAssignmentPromise,
      recentOutcomePromise,
    ]);

  const sessions = trackFilter
    ? (allSessions ?? []).filter((s: any) => s.track === trackFilter)
    : (allSessions ?? []).slice(0, 50);
  const completed = sessions.filter((s) => s.status === 'completed');
  const allCompleted = (allSessions ?? []).filter((s) => s.status === 'completed');
  const inProgress = (allSessions ?? []).filter((s) => s.status === 'in_progress');
  const streak = computeStreak(completed.map((s) => new Date(s.started_at)));
  const dayNumber = daysSinceSignup(user.created_at);

  // ---- Cohort leaderboard ----
  // Fetch all completed sessions across the whole cohort (every authed user)
  // for today's date, take max score per user. Renders below today's case as
  // a 5-row board. The captive cohort is currently invisible in-product —
  // surfacing it is the single highest-leverage retention move per the
  // research (apps with social streaks average 5.69-day streaks vs 4.25).
  const todayISO = new Date().toISOString().slice(0, 10);
  type LeaderRow = {
    userId: string;
    label: string;
    todayScore: number | null;
    weekScore: number;
    isMe: boolean;
  };
  let leaderboard: LeaderRow[] = [];
  try {
    const { data: cohortSessions } = await supabase
      .from('sessions')
      .select('user_id, score, started_at, ended_at, status')
      .eq('status', 'completed')
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const byUser = new Map<string, { today: number | null; week: number }>();
    for (const s of cohortSessions ?? []) {
      const uid = (s as any).user_id as string;
      const sc = (s as any).score as number | null;
      if (sc == null) continue;
      const dateISO = new Date((s as any).started_at).toISOString().slice(0, 10);
      const isToday = dateISO === todayISO;
      const cur = byUser.get(uid) ?? { today: null, week: 0 };
      if (isToday && (cur.today == null || sc > cur.today)) cur.today = sc;
      cur.week += sc;
      byUser.set(uid, cur);
    }
    // Resolve user labels via the auth user lookup. We only have user_id from
    // sessions; fetching emails requires the admin client, so for v1 just
    // show "You" for the current user and a short "Member N" for others.
    const ids = [...byUser.keys()];
    leaderboard = ids
      .map((uid, i) => {
        const stats = byUser.get(uid)!;
        return {
          userId: uid,
          label: uid === user.id ? 'You' : `Member ${i + 1}`,
          todayScore: stats.today,
          weekScore: stats.week,
          isMe: uid === user.id,
        };
      })
      .sort((a, b) => (b.todayScore ?? -1) - (a.todayScore ?? -1) || b.weekScore - a.weekScore)
      .slice(0, 5);
    // If the current user has no row yet (no completed session in the last 7
    // days), prepend a placeholder so they always see themselves.
    if (!leaderboard.some((r) => r.isMe)) {
      leaderboard = [
        { userId: user.id, label: 'You', todayScore: null, weekScore: 0, isMe: true },
        ...leaderboard,
      ].slice(0, 5);
    }
  } catch (e) {
    console.warn('[dashboard] leaderboard fetch failed:', e);
  }

  // Last session for greeting tone.
  const lastSession = (allSessions ?? [])[0] ?? null;
  const lastSessionStartedAt: string | null = lastSession?.started_at ?? null;
  const daysSinceLast = lastSessionStartedAt
    ? Math.floor((Date.now() - new Date(lastSessionStartedAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const greeting = pickGreeting({
    hasAnySessions: (allSessions ?? []).length > 0,
    lastSessionStartedAt,
    daysSinceLast,
  });

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

  // The Week — 7 cells, today rightmost. Filled if any session that day.
  const weekDays: { dateISO: string; label: string; isToday: boolean; hasSession: boolean }[] = [];
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const sevenDaysAgoMidnight = new Date(todayMidnight);
  sevenDaysAgoMidnight.setDate(todayMidnight.getDate() - 6);
  const weekSessionDays = new Set(
    (allSessions ?? [])
      .filter((s) => new Date(s.started_at) >= sevenDaysAgoMidnight)
      .map((s) => new Date(s.started_at).toISOString().slice(0, 10))
  );
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    weekDays.push({
      dateISO: iso,
      label: d.toLocaleDateString(undefined, { weekday: 'short' })[0],
      isToday: i === 0,
      hasSession: weekSessionDays.has(iso),
    });
  }
  const activeDaysThisWeek = weekDays.filter((d) => d.hasSession).length;

  // Recent debriefs — 3 most recent COMPLETED sessions (cohort-wide, not
  // track-filtered, since the dashboard reps card is global).
  const recentDebriefs = allCompleted.slice(0, 3);
  // Compute score deltas vs. the prior completed session for the arrow icon.
  const recentDebriefRows = recentDebriefs.map((s, idx) => {
    const prior = allCompleted[idx + 1];
    const delta =
      prior && typeof prior.score === 'number' && typeof s.score === 'number'
        ? (s.score ?? 0) - (prior.score ?? 0)
        : null;
    return { session: s, delta };
  });

  // Has the user already started their assigned case (any session, any time)?
  const assignmentSession = dailyAssignment
    ? (allSessions ?? []).find((s) => s.case_id === dailyAssignment.caseId)
    : null;
  const assignmentInProgress =
    assignmentSession?.status === 'in_progress' ? assignmentSession : null;
  const assignmentCompleted = assignmentSession?.status === 'completed';

  // Outcome-capture nudge: shown when the user has actually practiced
  // (≥1 completed session) and hasn't logged a real-interview outcome in the
  // last 14 days (hasRecentOutcome resolved in the Promise.all above; fails
  // open to false so the nudge still shows pre-migration).
  const showOutcomeNudge = allCompleted.length >= 1 && !hasRecentOutcome;

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <HuprObserveReveals />
      {/* A. HERO BAND — collapsed to a single line above the today's case
          card. Greeting + streak + library link in one row. The case card
          IS the hero now; this band is just orientation. Headspace pattern:
          one decision per surface, supporting context demoted. */}
      <section
        className="px-4 sm:px-8 py-12 sm:py-16"
        style={{ background: 'var(--hupr-cognac)', color: '#FFFFFF' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>
              Day {dayNumber} · CasePad
            </span>
            <Link
              href="/cases"
              className="hupr-mono-eyebrow underline"
              style={{ color: '#FFFFFF' }}
            >
              Library →
            </Link>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0' }} />
          <div className="mt-6 flex items-end justify-between gap-6 flex-wrap">
            <h1
              className="uppercase"
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6vw, 72px)',
                lineHeight: 1,
                margin: 0,
                color: '#FFFFFF',
                maxWidth: '20ch',
              }}
            >
              {greeting}
            </h1>
            <StreakFlame streak={streak} />
          </div>
        </div>
      </section>

      {/* STICKY CARD 1 — Today's case. Sand band. The single most important
          surface on dashboard, gets pole position. */}
      <article
        className="sticky px-4 sm:px-8 py-12 lg:py-16"
        style={{
          background: 'var(--hupr-sand)',
          color: '#FFFFFF',
          top: 0,
          zIndex: 1,
          minHeight: '70vh',
        }}
        data-tour="todays-case"
      >
        <div className="max-w-5xl mx-auto">
          <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF', opacity: 0.85 }}>01</span>
          <h2
            className="uppercase mt-3 mb-8"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              lineHeight: 0.95,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '70%',
            }}
          >
            Today
          </h2>
          {dailyAssignment ? (
            <TodaysCaseCard
              assignment={dailyAssignment}
              inProgressSessionId={assignmentInProgress?.id ?? null}
              completed={assignmentCompleted}
            />
          ) : (
            <EmptyTodaysCaseCard />
          )}
        </div>
      </article>

      {showOutcomeNudge && <OutcomeNudgeCard />}

      <div className="px-4 sm:px-8 py-12 max-w-5xl mx-auto">

      {/* B.2 COHORT LEADERBOARD — hide entirely when the only row is the
          self-placeholder with no real today-score. The empty leaderboard
          was creating a jarring white gap between the sand "Today" sticky
          band and the sage "Week" band. */}
      {leaderboard.some((r) => r.todayScore !== null && !r.isMe) && (
      <section className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="hupr-mono-eyebrow"
            style={{ color: 'var(--color-text-primary)' }}
          >
            COHORT TODAY
          </span>
          <span
            className="meta-label"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Top score · last 7 days
          </span>
        </div>
        <div
          className="overflow-hidden"
          style={{ background: 'var(--color-bg-canvas)', border: '1px solid var(--color-border)' }}
        >
          {leaderboard.length === 0 ? (
            <div
              className="p-4 text-xs text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No reps yet today. Be the first.
            </div>
          ) : (
            leaderboard.map((row, i) => (
              <div
                key={row.userId}
                className="flex items-center px-4 py-2.5 gap-3"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                  // isMe row used to use coral tint; per one-job rule (coral
                  // reserved for CTAs + asterisk), highlight is now a subtle
                  // elevated bg + bold weight on the name. Same behavioral
                  // signal, no ambient coral leak.
                  background: row.isMe
                    ? 'var(--color-bg-sunken)'
                    : 'transparent',
                }}
              >
                <span
                  className="font-mono text-[11px] w-6 tabular-nums"
                  style={{
                    color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontWeight: i === 0 ? 700 : 400,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  className="text-sm flex-1"
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: row.isMe ? 600 : 400,
                  }}
                >
                  {row.label}
                </span>
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  week {row.weekScore}
                </span>
                <span
                  className="font-mono text-base tabular-nums w-12 text-right"
                  style={{
                    color: row.todayScore == null
                      ? 'var(--color-text-muted)'
                      : 'var(--color-text-primary)',
                  }}
                >
                  {row.todayScore == null ? '—' : row.todayScore}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
      )}

      {/* STICKY CARD 2 — This Week. Sage band. */}
      <article
        className="sticky -mx-4 sm:-mx-8 px-4 sm:px-8 py-12 lg:py-16 mb-0"
        style={{
          background: 'var(--hupr-sage)',
          color: '#FFFFFF',
          top: 60,
          zIndex: 2,
          minHeight: '60vh',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF', opacity: 0.85 }}>02</span>
          <h2
            className="uppercase mt-3 mb-8"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              lineHeight: 0.95,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '70%',
            }}
          >
            The Week
          </h2>
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="hupr-mono-eyebrow"
            style={{ color: 'var(--color-text-primary)' }}
          >
            THIS WEEK
          </span>
          <span
            className="meta-label"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {activeDaysThisWeek} of 7 days active
            {streak >= 3 && <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>· {streak}-day streak</span>}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {weekDays.map((d) => (
            <div key={d.dateISO} className="flex flex-col items-center">
              <div
                className="aspect-square w-full"
                style={{
                  background: d.hasSession ? 'var(--color-text-primary)' : 'transparent',
                  border: d.isToday
                    ? '2px solid var(--color-text-primary)'
                    : '1px solid var(--color-border)',
                  borderRadius: 2,
                }}
                aria-label={`${d.dateISO}${d.hasSession ? ' (active)' : ' (inactive)'}${d.isToday ? ' (today)' : ''}`}
              />
              <span
                className="mt-1.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: d.isToday ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: d.isToday ? 700 : 400,
                }}
              >
                {d.isToday ? 'today' : d.label}
              </span>
            </div>
          ))}
        </div>
        </div>
      </article>

      {/* STICKY CARD 3 — Recent reps. Slate band. */}
      <article
        className="sticky -mx-4 sm:-mx-8 px-4 sm:px-8 py-12 lg:py-16 mb-0"
        style={{
          background: 'var(--hupr-slate)',
          color: '#FFFFFF',
          top: 120,
          zIndex: 3,
          minHeight: '60vh',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF', opacity: 0.85 }}>03</span>
          <h2
            className="uppercase mt-3 mb-8"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              lineHeight: 0.95,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '70%',
            }}
          >
            Recent reps
          </h2>
        <div className="mb-4">
          <span
            className="hupr-mono-eyebrow"
            style={{ color: '#FFFFFF', opacity: 0.85 }}
          >
            Last 3 sessions
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recentDebriefRows.map(({ session: s, delta }) => (
            <Link
              key={s.id}
              href={`/debrief/${s.id}`}
              className="block p-5 transition-opacity hover:opacity-90"
              style={{
                background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="uppercase mb-4 line-clamp-2"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.2,
                  color: 'var(--color-text-primary)',
                }}
              >
                {(s as any).cases?.title ?? 'Case'}
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: 36,
                    lineHeight: 1,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {s.score ?? 0}
                  {delta !== null && delta !== 0 && (
                    <span
                      className="ml-2"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {delta > 0 ? '▲' : '▼'}
                      {Math.abs(delta)}
                    </span>
                  )}
                </span>
                <span
                  className="meta-label"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {new Date(s.started_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))}
          {Array.from({ length: Math.max(0, 3 - recentDebriefRows.length) }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="p-5 flex items-center justify-center"
              style={{
                background: 'transparent',
                border: '1px dashed var(--color-border)',
                minHeight: '120px',
              }}
            >
              <span
                className="text-center"
                style={{
                  fontFamily: 'var(--font-accent)',
                  fontSize: 14,
                  color: 'var(--color-text-muted)',
                }}
              >
                Your reps will land here
              </span>
            </div>
          ))}
        </div>
        </div>
      </article>

      {/* STICKY CARD 4 — Library. Terra band. CTA-only. */}
      <a
        href="/cases"
        className="sticky block -mx-4 sm:-mx-8 px-4 sm:px-8 py-12 lg:py-16 transition-opacity hover:opacity-95 mb-12"
        style={{
          background: 'var(--hupr-terra)',
          color: '#FFFFFF',
          top: 180,
          zIndex: 4,
          minHeight: '50vh',
          textDecoration: 'none',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF', opacity: 0.85 }}>04</span>
          <h2
            className="uppercase mt-3 mb-6"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              lineHeight: 0.95,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '70%',
            }}
          >
            The Library
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 17,
              lineHeight: 1.55,
              color: '#FFFFFF',
              margin: 0,
              maxWidth: '50ch',
            }}
          >
            Browse 1,165 real cases across 5 tracks. Pick what calls you, or
            let Ash assign tomorrow&apos;s case.
          </p>
          <div className="mt-8">
            <span
              className="hupr-anim-btn"
              style={{
                background: '#FFFFFF',
                color: 'var(--hupr-terra)',
                padding: '14px 22px',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-block',
              }}
            >
              Wander the library →
            </span>
          </div>
        </div>
      </a>

      {/* E. RESUME IN-PROGRESS (above weak spots) */}
      {inProgress.length > 0 && (
        <section className="mb-10">
          <div className="mb-3">
            <span
              className="font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              UNFINISHED
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {inProgress.map((s: any) => (
              <Link
                key={s.id}
                href={`/solve/${s.case_id}?session=${s.id}`}
                className="px-3 py-2 transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--color-bg-sunken)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                }}
              >
                ▶ {(s.cases?.title || 'Case').slice(0, 40)}{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>
                  ({new Date(s.started_at).toLocaleDateString()})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* E.2 SCORE CURVE + WEAK SPOTS — side by side on desktop */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2">
          <div className="mb-3">
            <span
              className="font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              TRAJECTORY
            </span>
          </div>
          <ScoreCurve
            points={completed
              .slice()
              .reverse()
              .map((s: any) => ({
                date: s.started_at,
                score: s.score ?? 0,
              }))}
          />
        </div>
        <div>
          <div className="mb-3">
            <span
              className="font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              WEAK SPOTS
            </span>
          </div>
          {weakSpots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {weakSpots.map((w) => (
                <span
                  key={w.type}
                  className="px-3 py-2"
                  style={{
                    background: 'var(--color-bg-sunken)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {w.type.replace(/_/g, ' ')} · avg {w.avg} ({w.n})
                </span>
              ))}
            </div>
          ) : (
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No weak spots yet — complete a few more reps and patterns will surface here.
            </div>
          )}
        </div>
      </section>

      {/* Optional track filter — kept for power users but pushed below the fold */}
      {Object.keys(trackCounts).length > 1 && (
        <nav className="flex flex-wrap gap-1.5 mb-10 text-xs">
          <Link
            href="/dashboard"
            className="px-3 py-2 transition-opacity hover:opacity-90"
            style={{
              background: trackFilter === null ? 'var(--color-text-primary)' : 'transparent',
              color: trackFilter === null ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}
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
                className="px-3 py-2 transition-opacity hover:opacity-90"
                style={{
                  background: trackFilter === k ? 'var(--color-text-primary)' : 'transparent',
                  color: trackFilter === k ? 'var(--color-bg-canvas)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                }}
              >
                {TRACKS[k].short} ({n})
              </Link>
            );
          })}
        </nav>
      )}

      {/* F. LIBRARY ESCAPE HATCH */}
      <footer
        className="pt-8 mt-4 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Link
          href="/cases"
          className="meta-label hover:opacity-80"
        >
          Wander the library — 1,165 cases →
        </Link>
        <Link
          href="/how-it-works"
          className="meta-label hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
        >
          How it works
        </Link>
      </footer>
      </div>
    </main>
  );
}

function TodaysCaseCard({
  assignment,
  inProgressSessionId,
  completed,
}: {
  assignment: import('@/server-actions/assign-daily-case').DailyAssignment;
  inProgressSessionId: string | null;
  completed: boolean;
}) {
  const minutes = estimatedMinutes(assignment.caseDifficulty);
  const eyebrow = completed ? "TODAY'S CASE — DONE" : "TODAY'S CASE";
  const cta = completed
    ? null
    : inProgressSessionId
      ? { label: 'Resume →', href: `/solve/${assignment.caseId}?session=${inProgressSessionId}` }
      : { label: 'Begin →', href: `/solve/${assignment.caseId}` };

  // Format source attribution as "SOURCE · YEAR · TYPE" if pieces are
  // available. We only have caseType + raw source isn't on DailyAssignment, so
  // we render whatever we have in mono caps.
  const sourceLine = assignment.caseType.replace(/_/g, ' ').toUpperCase();

  return (
    <div
      className="relative p-8 sm:p-12 lg:p-16"
      style={{
        background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="hupr-mono-eyebrow mb-3" style={{ color: 'var(--color-text-primary)' }}>
        {eyebrow}
      </div>
      <hr className="hupr-hairline mb-8" />

      <h2
        className="uppercase mb-6 sm:mb-8 max-w-[18ch]"
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: 'clamp(36px, 6vw, 64px)',
          lineHeight: 0.95,
          letterSpacing: '-0.005em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        {assignment.caseTitle}
      </h2>

      <p
        className="hupr-fade-up mb-10 sm:mb-12 max-w-[50ch]"
        style={{
          fontFamily: 'var(--font-accent)',
          fontSize: 17,
          lineHeight: 1.55,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        {assignment.reason}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="meta-label px-3 py-1.5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          ≈ {minutes} min
        </span>
        <span
          className="meta-label px-3 py-1.5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {assignment.caseDifficulty}
        </span>
        <span
          className="meta-label px-3 py-1.5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {assignment.caseType.replace(/_/g, ' ')}
        </span>
        {cta && (
          <Link
            href={cta.href}
            className="hupr-anim-btn ml-auto"
            style={{
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg-canvas)',
              padding: '14px 22px',
              borderRadius: 6,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// Streak flame — sits in the hero band above the fold. Greys out at 0
// (loss-aversion cue), coral at ≥1, brighter at ≥7. Direct port of the
// Duolingo flame mechanic — the artifact-at-risk lives where the user
// can see it on every visit.
function StreakFlame({ streak }: { streak: number }) {
  const active = streak >= 1;
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-2"
      style={{
        background: active ? 'var(--color-text-primary)' : 'transparent',
        color: active ? 'var(--color-bg-canvas)' : 'var(--color-text-muted)',
        border: `1px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border)'}`,
        borderRadius: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        opacity: active ? 1 : 0.7,
      }}
      aria-label={active ? `${streak}-day streak` : 'No active streak — start one today'}
      title={active ? `${streak}-day streak` : 'No active streak — start one today'}
    >
      <span aria-hidden="true">{active ? '●' : '○'}</span>
      {streak} {streak === 1 ? 'day streak' : 'day streak'}
    </span>
  );
}

function EmptyTodaysCaseCard() {
  // Real cases only — never fabricate. When the daily assignment is missing
  // (migration not applied OR no good case found) we route the user to the
  // library and let them pick.
  return (
    <div
      className="relative p-8 sm:p-12 lg:p-16"
      style={{
        background: 'var(--color-bg-sunken)',
        border: '1px dashed var(--color-border)',
      }}
    >
      <div
        className="hupr-mono-eyebrow mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        TODAY’S CASE
      </div>
      <hr className="hupr-hairline mb-8" />
      <h2
        className="uppercase mb-6 sm:mb-8 max-w-[18ch]"
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: 'clamp(36px, 6vw, 64px)',
          lineHeight: 0.95,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        Wander the library — pick what calls you.
      </h2>
      <p
        className="hupr-fade-up mb-10 sm:mb-12 max-w-[50ch]"
        style={{
          fontFamily: 'var(--font-accent)',
          fontSize: 17,
          lineHeight: 1.55,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        We’ll line up tomorrow’s case for you once you’ve got a few reps in.
      </p>
      <Link
        href="/cases"
        className="hupr-anim-btn inline-block"
        style={{
          background: 'var(--color-text-primary)',
          color: 'var(--color-bg-canvas)',
          padding: '14px 22px',
          borderRadius: 6,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textDecoration: 'none',
        }}
      >
        Pick your first case →
      </Link>
    </div>
  );
}
