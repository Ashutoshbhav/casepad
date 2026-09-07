import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TRACKS } from '@/lib/tracks';
import { CompletionBanner } from '@/components/completion-banner';
import { totalXp } from '@/lib/xp-heuristics';
import { streakDaysFromTimestamps } from '@/lib/streak-copy';
import { IdealWalkthroughLoader } from '@/components/ideal-walkthrough-loader';
import { WALKTHROUGH_GENERATOR_VERSION } from '@/lib/groq/walkthrough';
import { SessionFeedbackForm } from '@/components/session-feedback-form';
import { DebriefFeedbackModal } from '@/components/debrief-feedback-modal';
import { getSkillProfile } from '@/lib/skills/apply';
import { getFirmView } from '@/lib/firm/apply';
import { SkillProfileCard } from '@/components/skill-profile-card';
import { assignDailyCase, estimatedMinutes } from '@/server-actions/assign-daily-case';
import { assignEngagement } from '@/server-actions/assign-engagement';
import type { Track } from '@/lib/tracks';
import { roomFontVars } from '@/components/room/fonts';
import { SketchyUnderline, SketchyProgressBar, SketchyLine } from '@/components/room/sketchy';

// v2 "room" debrief palette — cream ground, ink text, one warm accent.
const INK = 'rgb(50,50,52)';
const CREAM = '#F5F0E8';
const HAIR = 'rgba(0,0,0,0.18)';
const ACCENT = "#f54e00"; // decorative only
const ACCENT_TEXT = "#c23f00"; // AA as text / white-on-accent
const DIM_FILL = ['#f54e00', '#5e6ad2', '#f65726', '#3d5a6c', '#a64b52'];

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

  // The Firm's own pick (PRD v3.1 Stage 3.3): rank sets the difficulty, the
  // Twin sets the focus. Preferred over the daily assignment when available;
  // both degrade to null independently.
  const nextEngagement = user
    ? await assignEngagement(user.id, preferredTrack ?? null).catch((e) => {
        console.warn('[debrief] engagement assign failed:', e);
        return null;
      })
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

  // The Twin (PRD v3.1 Stage 1). Best-effort read; degrades to null (card
  // renders nothing). skill_state populates as the knowledge-tracing pass runs
  // after each session, so early on this is empty and the card says so.
  let skillProfile = null;
  let firm = null;
  if (user?.id) {
    try {
      skillProfile = await getSkillProfile(supabase, user.id);
    } catch (e) {
      console.warn('[debrief] skill profile fetch failed:', e);
    }
    try {
      firm = await getFirmView(supabase, user.id);
    } catch (e) {
      console.warn('[debrief] firm view fetch failed:', e);
    }
  }

  const scoreVal = session.score ?? 0;
  const takeaway: string =
    (typeof b?.summary === 'string' && b.summary) ||
    (typeof b?.headline === 'string' && b.headline) ||
    (verdict === 'strong'
      ? 'Offer-level. You held structure where it counted.'
      : verdict === 'reject'
        ? 'Below the bar this round. The structure is there; the depth is not yet.'
        : 'Solid rep. Sharper than a laundry list, not yet a partner-room answer.');

  return (
    <main
      data-room
      className={roomFontVars}
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: 'var(--font-room-mono)',
      }}
    >
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        Debrief — {caseRow?.title ?? 'session'}, scored {session.score ?? 0} out of 100
      </h1>

      {/* EYEBROW ROW */}
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '28px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-room-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(50,50,52,0.62)',
        }}
      >
        <Link href="/dashboard" className="room-link" style={{ color: 'rgba(50,50,52,0.62)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <span>
          Debrief · {caseRow?.title ?? 'Session'} · {session.transcript?.length ?? 0} turns
        </span>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 96px' }}>
        {firm && (
          <Link
            href="/firm"
            className="room-link"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 24,
              padding: '12px 16px',
              background: '#FFFFFF',
              boxShadow: 'inset 0 0 0 1px #e8e4dd',
              textDecoration: 'none',
              color: INK,
            }}
          >
            <span style={{ fontFamily: 'var(--font-room-mono)', fontSize: 12 }}>
              <strong style={{ fontWeight: 600 }}>{firm.title}</strong>
              <span style={{ color: 'rgba(50,50,52,0.62)' }}>
                {' '}
                · {firm.engagementsTotal} engagement{firm.engagementsTotal === 1 ? '' : 's'}
                {firm.atTop
                  ? ' · top of the firm'
                  : firm.promoEligible
                    ? ` · cleared for ${firm.nextTitle} review`
                    : ` · ${Math.max(0, (firm.criteria.find((c) => c.key === 'engagements')?.target ?? 0) - firm.engagementsAtLevel)} more to ${firm.nextTitle} review`}
              </span>
            </span>
            <span
              style={{
                fontFamily: 'var(--font-room-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#c23f00',
              }}
            >
              Your record →
            </span>
          </Link>
        )}
        <div style={{ marginTop: 28 }}>
          <CompletionBanner
            xpEarned={xpEarned}
            streakDays={streakDays}
            totalCompleted={totalCompleted}
            isNewRecord={isNewRecord}
          />
        </div>

        {(usedFallback || walkthroughFallback) && (
          <div
            role="status"
            style={{
              margin: '24px 0 0',
              padding: 14,
              border: `1px solid ${ACCENT_TEXT}`,
              color: ACCENT_TEXT,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            ⚠ {usedFallback && walkthroughFallback
              ? 'Scoring and walkthrough services were down'
              : usedFallback
                ? 'The scoring service was down'
                : 'The walkthrough service was down'}{' '}
            when you ended this session — what you see is a placeholder. Re-run the case for a real score; your transcript and tree are saved.
          </div>
        )}

        {/* SCORE REVEAL */}
        <section style={{ textAlign: 'center', padding: 'clamp(48px, 9vw, 104px) 0 40px' }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(50,50,52,0.62)',
              marginBottom: 'clamp(20px, 4vw, 36px)',
            }}
          >
            Your score · out of 100
          </p>
          <div
            style={{
              fontFamily: 'var(--font-room-serif)',
              fontWeight: 300,
              fontSize: 'clamp(120px, 30vw, 420px)',
              lineHeight: 0.82,
              letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {scoreVal}
          </div>
          <div style={{ width: 'min(260px, 46vw)', margin: '6px auto 0' }}>
            <SketchyUnderline strokeWidth={6} roughness={2.6} bowing={5} stroke={ACCENT} />
          </div>
          <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {verdict && VERDICT_META[verdict] && !usedFallback && (
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  padding: '5px 12px',
                  border: `1px solid ${VERDICT_META[verdict].color}`,
                  color: VERDICT_META[verdict].color,
                }}
              >
                {VERDICT_META[verdict].label}
              </span>
            )}
            {verdict === 'reject' && below3.length > 0 && (
              <span style={{ fontSize: 11, color: 'rgba(50,50,52,0.62)' }}>
                below bar on: {below3.join(', ')}
              </span>
            )}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-room-display)',
              fontWeight: 500,
              fontSize: 'clamp(18px, 2.4vw, 28px)',
              lineHeight: 1.3,
              color: 'rgba(50,50,52,0.82)',
              margin: '28px auto 0',
              maxWidth: '34ch',
            }}
          >
            {takeaway}
          </p>
        </section>

        {/* BREAKDOWN */}
        <section style={{ marginTop: 8 }}>
          <SectionLabel>Breakdown</SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${scoreDims.length > 3 ? 180 : 220}px, 1fr))`,
              marginTop: 36,
              borderTop: `1px solid ${HAIR}`,
            }}
          >
            {scoreDims.map((d, i) => (
              <div key={d.label} style={{ padding: '28px 26px', borderRight: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(50,50,52,0.62)',
                    marginBottom: 16,
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-room-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(52px, 7vw, 92px)',
                    lineHeight: 0.95,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  {Math.round(d.value)}
                  <span style={{ fontSize: 'clamp(16px, 2vw, 26px)', color: 'rgba(50,50,52,0.4)', fontWeight: 400 }}>
                    / {d.max}
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <SketchyProgressBar
                    pct={d.max ? (d.value / d.max) * 100 : 0}
                    height={22}
                    stroke={INK}
                    fillColor={DIM_FILL[i % DIM_FILL.length]}
                    roughness={1.5}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* STRENGTHS / GAPS */}
        {((b.strengths ?? []).length > 0 || (b.gaps ?? []).length > 0) && (
          <section style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: 56 }}>
            {[
              { label: 'What worked', items: (b.strengths ?? []) as string[] },
              { label: 'What to sharpen', items: (b.gaps ?? []) as string[] },
            ].map((col) => (
              <div key={col.label}>
                <SectionLabel>{col.label}</SectionLabel>
                <SketchyLine stroke={INK} strokeWidth={1.4} roughness={1.6} style={{ margin: '10px 0 14px' }} />
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, lineHeight: 1.7 }}>
                  {col.items.map((s, i) => (
                    <li key={i} style={{ marginBottom: 6, display: 'flex', gap: 10 }}>
                      <span aria-hidden style={{ color: ACCENT }}>·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* THE TWIN */}
        <div style={{ marginTop: 56 }}>
          <SkillProfileCard profile={skillProfile} />
        </div>

        {/* WALKTHROUGH */}
        {caseRow && (
          <section style={{ marginTop: 72 }}>
            <SectionLabel>Ideal walkthrough · annotated</SectionLabel>
            <h2
              style={{
                fontFamily: 'var(--font-room-display)',
                fontWeight: 700,
                fontSize: 'clamp(32px, 5vw, 60px)',
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
                margin: '18px 0 28px',
                maxWidth: '16ch',
              }}
            >
              What sharper looks like.
            </h2>
            <IdealWalkthroughLoader
              sessionId={sessionId}
              initial={cachedWalkthrough}
              initialFresh={walkthroughFresh}
            />
          </section>
        )}

        {/* NEXT ENGAGEMENT — the Firm's pick (rank × Twin) if available, else
            the daily assignment, else a free pick. */}
        {(() => {
          const eyebrowText = nextEngagement
            ? 'Next engagement'
            : tomorrowAssignment
              ? 'Next case'
              : 'Tomorrow';
          const title = nextEngagement
            ? nextEngagement.caseTitle
            : tomorrowAssignment
              ? tomorrowAssignment.caseTitle
              : 'Pick what calls you.';
          const meta = nextEngagement
            ? `${nextEngagement.caseType.replace(/_/g, ' ')} · ${nextEngagement.caseDifficulty}${nextEngagement.generated ? ' · generated' : ''}`
            : tomorrowAssignment
              ? `${tomorrowAssignment.caseType.replace(/_/g, ' ')} · ≈ ${estimatedMinutes(tomorrowAssignment.caseDifficulty)} min`
              : null;
          const body = nextEngagement
            ? nextEngagement.brief.rationale
            : tomorrowAssignment
              ? pickTransitionLine(tomorrowAssignment.caseType)
              : 'Wander the library tomorrow.';
          const focus =
            nextEngagement && nextEngagement.brief.focusSkillNames.length > 0
              ? nextEngagement.brief.focusSkillNames.join(' · ')
              : null;
          const href = nextEngagement
            ? `/solve/${nextEngagement.caseId}`
            : '/dashboard';
          const cta = nextEngagement || tomorrowAssignment ? 'Begin →' : 'Set anticipation →';
          const accented = !!nextEngagement && nextEngagement.brief.twinDriven;
          return (
            <section style={{ marginTop: 80 }}>
              <div
                style={{
                  background: '#FFFFFF',
                  boxShadow: `inset 0 0 0 1px ${accented ? ACCENT_TEXT : '#e8e4dd'}`,
                  padding: 'clamp(24px, 4vw, 40px)',
                  maxWidth: 520,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(50,50,52,0.62)',
                    paddingBottom: 10,
                    borderBottom: `1px solid ${HAIR}`,
                    marginBottom: 18,
                  }}
                >
                  {eyebrowText}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-room-serif)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    fontSize: 'clamp(26px, 3.4vw, 34px)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    margin: '0 0 14px',
                  }}
                >
                  {title}
                </h3>
                {meta && (
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'rgba(50,50,52,0.62)',
                      marginBottom: 14,
                    }}
                  >
                    {meta}
                  </div>
                )}
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(50,50,52,0.72)', margin: '0 0 16px', maxWidth: '46ch' }}>
                  {body}
                </p>
                {focus && (
                  <p
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: ACCENT_TEXT,
                      margin: '0 0 20px',
                    }}
                  >
                    Focus: {focus}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={href}
                    style={{
                      background: ACCENT_TEXT,
                      color: '#FFFFFF',
                      borderRadius: 999,
                      padding: '11px 20px',
                      boxShadow: 'rgba(50,50,52,0.4) 4px 4px 0 0',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                    }}
                  >
                    {cta}
                  </Link>
                  <Link
                    href="/cases"
                    className="room-link"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(50,50,52,0.62)',
                      textDecoration: 'underline',
                    }}
                  >
                    Or keep going now
                  </Link>
                </div>
              </div>
            </section>
          );
        })()}

        <div style={{ marginTop: 64 }}>
          <SessionFeedbackForm sessionId={sessionId} />
        </div>
      </div>

      <DebriefFeedbackModal sessionId={sessionId} initiallyDismissed={feedbackAlreadyGiven} />
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-room-mono)',
        fontSize: 11,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'rgba(50,50,52,0.62)',
      }}
    >
      {children}
    </span>
  );
}
