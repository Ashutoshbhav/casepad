import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { ScoreCurve } from '@/components/score-curve';
import { TRACK_LIST, TRACKS, type Track } from '@/lib/tracks';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import { AsteriskSceneRegister } from '@/components/asterisk-scene-register';
import { DashboardWeekStreak } from '@/components/dashboard-week-streak';
import { HuprMarquee } from '@/components/hupr-marquee';
import { DashboardHeroUnderline } from '@/components/dashboard-hero-underline';
import {
  Masthead,
  SectionEyebrow,
} from '@/app/design-lab/v2/_components/masthead';
import { SketchyCornerTick } from '@/app/design-lab/v2/_components/sketchy';

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

  // ── HUPR-flavor v2-sample composition (Wave D — full structural rewrite).
  // Replaces the prior 9-section "data dashboard" IA with v2's editorial
  // 4-section composition: Masthead → Hero billboard → Streak → Recent
  // reps → Marquee. The case title is the page's massive centerpiece;
  // everything else is supporting context. Data sections that don't fit
  // (cohort leaderboard / score curve / weak spots / track filter /
  // resume-in-progress) are dropped from the default surface.

  const titleText = dailyAssignment?.caseTitle ?? 'Wander the library';
  const cta = dailyAssignment
    ? assignmentCompleted
      ? null
      : assignmentInProgress
        ? { label: 'Resume →', href: `/solve/${dailyAssignment.caseId}?session=${assignmentInProgress.id}` }
        : { label: 'Begin →', href: `/solve/${dailyAssignment.caseId}` }
    : { label: 'Pick a case →', href: '/cases' };
  const minutes = dailyAssignment ? estimatedMinutes(dailyAssignment.caseDifficulty) : null;
  const metaLine = dailyAssignment
    ? `${dailyAssignment.caseType.replace(/_/g, ' ').toUpperCase()} · ${dailyAssignment.caseDifficulty} · ≈ ${minutes} min`
    : '1,165 cases — pick what calls you';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <AsteriskSceneRegister preset="dashboard" />

      {/* ── Masthead — CASEPAD wordmark + caption + MENU pill ── */}
      <Masthead caption={['Practice', 'Centre for', 'Consulting Cases']} />
      <SectionEyebrow
        label={`Today · Day ${dayNumber}`}
        meta={`cohort one · ${greeting.toLowerCase()}`}
      />

      {/* ── HERO BILLBOARD — case title at clamp(64-192px) Montserrat 700 caps ── */}
      <section
        style={{
          padding: 'clamp(60px, 10vw, 120px) 36px 80px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
        data-tour="todays-case"
      >
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 'clamp(56px, 11vw, 192px)',
            lineHeight: 0.92,
            letterSpacing: '-0.025em',
            color: 'rgb(50,50,52)',
            margin: 0,
            maxWidth: '14ch',
            textTransform: 'uppercase',
          }}
        >
          {titleText}.
        </h1>
        <div style={{ width: 'min(420px, 35vw)', marginTop: 12 }}>
          <DashboardHeroUnderline />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginTop: 56,
            paddingTop: 24,
            borderTop: '1px solid rgba(0,0,0,0.18)',
            maxWidth: 760,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.65)',
            }}
          >
            {metaLine}
          </span>
          {cta && (
            <Link
              href={cta.href}
              style={{
                marginLeft: 'auto',
                background: '#f54e00',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                padding: '14px 32px',
                boxShadow: 'rgba(50,50,52,0.45) 4px 4px 0px 0px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                transition: 'transform 120ms ease',
              }}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </section>

      {/* ── STREAK — sketchy 7-day calendar circles ── */}
      <section style={{ padding: '40px 36px 80px', maxWidth: 1400, margin: '0 auto' }}>
        <SectionEyebrow
          label={`Streak · ${activeDaysThisWeek} of 7 days`}
          meta={streak >= 1 ? `${streak}-day run` : 'no active streak'}
        />
        <div style={{ paddingTop: 36, paddingBottom: 36 }}>
          <DashboardWeekStreak weekDays={weekDays} />
        </div>
      </section>

      {/* ── RECENT REPS — 4-up warm-dark index card grid (2-up on mobile) ── */}
      {recentDebriefRows.length > 0 && (
        <section style={{ padding: '40px 36px 80px', maxWidth: 1400, margin: '0 auto' }}>
          <SectionEyebrow
            label="Recent reps"
            meta={`last ${recentDebriefRows.length} sessions`}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
              paddingTop: 32,
            }}
          >
            {recentDebriefRows.map(({ session: s, delta }) => (
              <Link
                key={s.id}
                href={`/debrief/${s.id}`}
                style={{
                  position: 'relative',
                  background: '#1a1817',
                  color: '#faf9f5',
                  aspectRatio: '4 / 5',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
                }}
              >
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <SketchyCornerTick
                    size={18}
                    stroke="rgba(250,249,245,0.5)"
                    strokeWidth={1.2}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgba(250,249,245,0.55)',
                      marginBottom: 12,
                    }}
                  >
                    {new Date(s.started_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-headline)',
                      fontWeight: 700,
                      fontSize: 18,
                      lineHeight: 1.1,
                      letterSpacing: '-0.005em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {((s as any).cases?.title ?? 'Case')}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 24,
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.score ?? 0}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
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
          </div>
        </section>
      )}

      {/* ── MARQUEE — decorative italic ribbon ── */}
      <HuprMarquee text="The practice compounds." />

      {/* ── FOOTER — quiet editorial closer ── */}
      <footer
        style={{
          padding: '24px 36px 32px',
          borderTop: '1px solid rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <Link
          href="/cases"
          className="font-headline italic hover:opacity-80"
          style={{
            color: 'rgb(50,50,52)',
            fontSize: 'clamp(20px, 2.4vw, 28px)',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            textDecoration: 'none',
          }}
        >
          Wander the library — 1,165 cases →
        </Link>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link
            href="/dashboard?view=stats"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.6)',
              textDecoration: 'none',
            }}
          >
            Stats →
          </Link>
          <Link
            href="/how-it-works"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.5)',
              textDecoration: 'none',
            }}
          >
            How it works
          </Link>
        </div>
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
        className="font-mono text-[11px] uppercase tracking-[0.22em] mb-6 sm:mb-8"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {eyebrow}
      </div>

      <h2
        className="font-headline italic mb-3 max-w-[18ch]"
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'clamp(40px, 6vw, 72px)',
          lineHeight: 1.0,
          letterSpacing: '-0.025em',
        }}
      >
        {assignment.caseTitle}
      </h2>
      {/* Wave C: sketchy ink underline beneath the case-title hero —
          same Rough.js mark as the dashboard greeting + debrief
          score reveal. Visual through-line across the journey. */}
      <div className="mb-6 sm:mb-8" style={{ width: 'min(220px, 30vw)' }}>
        <DashboardHeroUnderline />
      </div>

      <p
        className="font-headline italic text-[19px] sm:text-[22px] leading-[1.4] mb-10 sm:mb-12 max-w-[44ch]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {assignment.reason}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="font-mono uppercase px-4 py-2"
          style={{
            background: '#1a1817',
            color: '#faf9f5',
            fontSize: 11,
            letterSpacing: '0.22em',
            borderRadius: 999,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          ≈ {minutes} MIN
        </span>
        <span
          className="font-mono uppercase px-4 py-2"
          style={{
            background: '#1a1817',
            color: '#faf9f5',
            fontSize: 11,
            letterSpacing: '0.22em',
            borderRadius: 999,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          {assignment.caseDifficulty}
        </span>
        <span
          className="font-mono uppercase px-4 py-2"
          style={{
            background: '#1a1817',
            color: '#faf9f5',
            fontSize: 11,
            letterSpacing: '0.22em',
            borderRadius: 999,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
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
      // Wave C: warm-dark pill matching meta chips + resume chips.
      className="inline-flex items-center gap-2 px-3 py-1.5 font-mono uppercase"
      style={{
        color: active ? '#f54e00' : 'rgba(250,249,245,0.55)',
        background: active ? '#1a1817' : 'transparent',
        boxShadow: active
          ? '0 0 0 1px rgba(255,255,255,0.08) inset'
          : '0 0 0 1px rgba(50,50,52,0.20) inset',
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: '0.22em',
        opacity: active ? 1 : 0.7,
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
        className="font-mono text-[11px] uppercase tracking-[0.22em] mb-6 sm:mb-8"
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
