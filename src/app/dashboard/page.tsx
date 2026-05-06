import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { ScoreCurve } from '@/components/score-curve';
import { TRACK_LIST, TRACKS, type Track } from '@/lib/tracks';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import { AsteriskSceneRegister } from '@/components/asterisk-scene-register';
import { AsteriskHotspot } from '@/components/asterisk-hotspot';
import { DashboardWeekStreak } from '@/components/dashboard-week-streak';
import { HuprMarquee } from '@/components/hupr-marquee';
import { DashboardHeroUnderline } from '@/components/dashboard-hero-underline';

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
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;

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
  const [, { data: allSessions }, dailyAssignment] = await Promise.all([
    expirePromise,
    sessionsListPromise,
    dailyAssignmentPromise,
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

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      <AsteriskSceneRegister preset="dashboard" />
      {/* Dashboard-only: invisible click target over the asterisk's render
          area. Hover triggers anticipating, click triggers celebrating +
          smooth-scroll to today's case section. Item #5 of the visual
          baseline reset — gives the character agency without re-enabling
          WebGL raycasting (which previously ate every click site-wide). */}
      <AsteriskHotspot />
      {/* A. HERO BAND — Wave C HUPR upgrade.
          Greeting promoted from a one-liner to an editorial headline:
          Instrument Serif italic, large, with a sketchy ink underline
          (Rough.js via Wave A token). Day number + streak flame + library
          link sit on a meta strip below the headline. */}
      <section className="mb-10 sm:mb-12">
        <div
          className="font-mono text-[10px] uppercase tracking-[0.22em] mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Day {dayNumber} · Cohort One
        </div>
        <h1
          className="font-headline italic"
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'clamp(40px, 7vw, 96px)',
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
            margin: 0,
            maxWidth: '20ch',
          }}
        >
          {greeting}
        </h1>
        <DashboardHeroUnderline />
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <StreakFlame streak={streak} />
          </div>
          <Link
            href="/cases"
            className="meta-label hover:opacity-80"
          >
            Library →
          </Link>
        </div>
      </section>

      {/* B. TODAY'S CASE CARD — data-tour="todays-case" anchors the
          asterisk-hotspot click action. Hotspot smooth-scrolls here. */}
      <section className="mb-12 sm:mb-16" data-tour="todays-case">
        {dailyAssignment ? (
          <TodaysCaseCard
            assignment={dailyAssignment}
            inProgressSessionId={assignmentInProgress?.id ?? null}
            completed={assignmentCompleted}
          />
        ) : (
          <EmptyTodaysCaseCard />
        )}
      </section>

      {/* B.2 COHORT LEADERBOARD */}
      <section className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-text-muted)' }}
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
          className="rounded-md overflow-hidden"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
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

      {/* C. THE WEEK */}
      <section className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            THIS WEEK
          </span>
          <span
            className="meta-label"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {activeDaysThisWeek} of 7 days active
            {streak >= 3 && <span className="ml-2" style={{ color: 'var(--color-accent-bright)' }}>· {streak}-day streak</span>}
          </span>
        </div>
        {/* v2 sketchy streak (Wave C surgical):
              today    → Onyx Outline #f54e00 (live, your turn now)
              past     → Aether Blue #5e6ad2 (completed)
              inactive → muted ink ring */}
        <DashboardWeekStreak weekDays={weekDays} />
      </section>

      {/* D. RECENT DEBRIEFS */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-4">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            RECENT REPS
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recentDebriefRows.map(({ session: s, delta }) => (
            <Link
              key={s.id}
              href={`/debrief/${s.id}`}
              // Wave C: v2-style warm-dark index card with hairline
              // inset border (ElevenLabs refero). Replaces the previous
              // light rounded-md card so recent reps read as the same
              // leather-bound book-cover surface as /cases case cards.
              className="relative block p-4 transition-opacity hover:opacity-90"
              style={{
                background: '#1a1817',
                color: '#faf9f5',
                aspectRatio: '1 / 1.25',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(250,249,245,0.55)',
                    marginBottom: 10,
                  }}
                >
                  {new Date(s.started_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div
                  className="font-headline italic"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                    color: '#faf9f5',
                  }}
                >
                  {(s as any).cases?.title ?? 'Case'}
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 22, color: '#faf9f5', fontWeight: 500 }}
                >
                  {s.score ?? 0}
                </span>
                {delta !== null && delta !== 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.16em',
                      color: delta > 0 ? '#f54e00' : 'rgba(250,249,245,0.55)',
                    }}
                  >
                    {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
                  </span>
                )}
              </div>
            </Link>
          ))}
          {Array.from({ length: Math.max(0, 3 - recentDebriefRows.length) }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="rounded-md p-4 flex items-center justify-center"
              style={{
                background: 'transparent',
                border: '1px dashed var(--color-border)',
                minHeight: '96px',
              }}
            >
              <span
                className="font-headline italic text-sm text-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Your reps will land here
              </span>
            </div>
          ))}
        </div>
      </section>

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
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: 'color-mix(in oklab, var(--color-accent) 14%, transparent)',
                  color: 'var(--color-accent-bright)',
                  border: '1px solid color-mix(in oklab, var(--color-accent) 35%, transparent)',
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
                  className="text-xs px-3 py-1.5 rounded-md"
                  style={{
                    background: 'color-mix(in oklab, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent-bright)',
                    border: '1px solid color-mix(in oklab, var(--color-accent) 25%, transparent)',
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
            className="px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: trackFilter === null ? 'var(--color-accent)' : 'transparent',
              color: trackFilter === null ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
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
                className="px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: trackFilter === k ? 'var(--color-accent)' : 'transparent',
                  color: trackFilter === k ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {TRACKS[k].short} ({n})
              </Link>
            );
          })}
        </nav>
      )}

      {/* Wave C HUPR-flavor bottom marquee — decorative ribbon */}
      <HuprMarquee text="The practice compounds." />

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
      className="relative rounded-xl p-8 sm:p-12 lg:p-16"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Eyebrow — kept simple, no underline, no coral. The headline
          carries weight; the eyebrow just labels the section. */}
      <div
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-6 sm:mb-8"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {eyebrow}
      </div>

      <h2
        className="font-headline italic text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.0] tracking-tight mb-6 sm:mb-8 max-w-[18ch]"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {assignment.caseTitle}
      </h2>

      <p
        className="font-headline italic text-[19px] sm:text-[22px] leading-[1.4] mb-10 sm:mb-12 max-w-[44ch]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {assignment.reason}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="meta-label px-3 py-1.5 rounded-full"
          style={{ border: '1px solid var(--color-border)' }}
        >
          ≈ {minutes} min
        </span>
        <span
          className="meta-label px-3 py-1.5 rounded-full"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {assignment.caseDifficulty}
        </span>
        <span
          className="meta-label px-3 py-1.5 rounded-full"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {assignment.caseType.replace(/_/g, ' ')}
        </span>
        {cta && (
          <Link
            href={cta.href}
            // refero: cursor (Onyx Outline color via token) + ed
            // hinrichsen (stamped offset shadow) + elevenlabs (pill).
            className="ml-auto px-8 py-3.5 text-sm sm:text-base font-medium uppercase tracking-[0.18em] transition-transform active:translate-x-[2px] active:translate-y-[2px]"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              borderRadius: 999,
              boxShadow: 'rgba(50,50,52,0.45) 4px 4px 0px 0px',
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
  const onFire = streak >= 7;
  const color = onFire
    ? 'var(--color-accent-bright)'
    : active
      ? 'var(--color-accent)'
      : 'var(--color-text-muted)';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em]"
      style={{
        color,
        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: active
          ? 'color-mix(in oklab, var(--color-accent) 10%, transparent)'
          : 'transparent',
        opacity: active ? 1 : 0.65,
      }}
      aria-label={active ? `${streak}-day streak` : 'No active streak — start one today'}
      title={active ? `${streak}-day streak` : 'No active streak — start one today'}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
        {/* Simple flame glyph — Pro icon paths are heavy, this stays tight. */}
        <path d="M6 0c1.5 2 3 3.5 3 6.5C9 9 7.5 11 6 11c-1.5 0-3-2-3-4.5C3 8 1.5 9 1.5 10.5 1.5 12.5 3.5 14 6 14s4.5-1.5 4.5-3.5C10.5 7 8 5 6 0z" />
      </svg>
      {streak} {streak === 1 ? 'day' : 'days'}
    </span>
  );
}

function EmptyTodaysCaseCard() {
  // Real cases only — never fabricate. When the daily assignment is missing
  // (migration not applied OR no good case found) we route the user to the
  // library and let them pick.
  return (
    <div
      className="relative rounded-xl p-8 sm:p-12 lg:p-16"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px dashed var(--color-border)',
      }}
    >
      <div
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-6 sm:mb-8"
        style={{ color: 'var(--color-text-muted)' }}
      >
        TODAY’S CASE
      </div>
      <h2
        className="font-headline italic text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.0] tracking-tight mb-6 sm:mb-8 max-w-[18ch]"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Wander the library — pick what calls you.
      </h2>
      <p
        className="font-headline italic text-[19px] sm:text-[22px] leading-[1.4] mb-10 sm:mb-12 max-w-[44ch]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        We’ll line up tomorrow’s case for you once you’ve got a few reps in.
      </p>
      <Link
        href="/cases"
        className="inline-block px-7 py-3.5 rounded-md text-base sm:text-lg font-medium transition-opacity hover:opacity-90"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-accent-fg)',
        }}
      >
        Pick your first case →
      </Link>
    </div>
  );
}
