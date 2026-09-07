import Link from 'next/link';
import type { Track } from '@/lib/tracks';
import { requireUser } from '@/lib/supabase/require-user';
import { getFirmView } from '@/lib/firm/apply';
import { assignEngagement } from '@/server-actions/assign-engagement';
import { LEVELS } from '@/lib/firm/levels';
import { roomFontVars } from '@/components/room/fonts';
import { SketchyUnderline, SketchyProgressBar } from '@/components/room/sketchy';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The Firm — CasePad' };

const INK = 'rgb(50,50,52)';
const CREAM = '#F5F0E8';
const MUTE = 'rgba(50,50,52,0.62)';
const HAIR = 'rgba(0,0,0,0.18)';
const ACCENT = '#f54e00';
const ACCENT_TEXT = '#c23f00';

export default async function FirmPage() {
  const { supabase, user } = await requireUser();
  const firm = await getFirmView(supabase, user.id).catch(() => null);
  const track = (user.user_metadata?.preferred_track as Track | undefined) ?? null;
  const engagement = await assignEngagement(user.id, track).catch(() => null);

  const eyebrow: React.CSSProperties = {
    fontFamily: 'var(--font-room-mono)',
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: MUTE,
  };

  return (
    <main
      data-room
      className={roomFontVars}
      style={{ minHeight: '100vh', background: CREAM, color: INK, fontFamily: 'var(--font-room-mono)' }}
    >
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '28px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', ...eyebrow }}>
          <Link href="/dashboard" className="room-link" style={{ color: MUTE, textDecoration: 'none' }}>
            ← Dashboard
          </Link>
          <span>The Firm</span>
        </div>

        {!firm ? (
          <p style={{ marginTop: 48, fontSize: 14, color: MUTE }}>
            Your record isn&apos;t available right now. Finish a case and it&apos;ll be here.
          </p>
        ) : (
          <>
            {/* RANK */}
            <section style={{ marginTop: 'clamp(40px, 8vw, 88px)' }}>
              <p style={{ ...eyebrow, marginBottom: 20 }}>Your rank</p>
              <h1
                style={{
                  fontFamily: 'var(--font-room-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(44px, 8vw, 104px)',
                  letterSpacing: '-0.03em',
                  lineHeight: 0.95,
                  margin: 0,
                }}
              >
                {firm.title}
              </h1>
              <div style={{ width: 'min(260px, 46vw)', marginTop: 8 }}>
                <SketchyUnderline strokeWidth={5} roughness={2.4} bowing={4} stroke={ACCENT} />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-room-mono)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'rgba(50,50,52,0.82)',
                  margin: '26px 0 0',
                  maxWidth: '54ch',
                }}
              >
                {firm.blurb}
              </p>
              <p style={{ ...eyebrow, marginTop: 20, letterSpacing: '0.14em' }}>
                {firm.engagementsTotal} engagement{firm.engagementsTotal === 1 ? '' : 's'} ·{' '}
                {firm.engagementsAtLevel} at this level
              </p>
            </section>

            {/* PROMOTION REVIEW */}
            {!firm.atTop && (
              <section style={{ marginTop: 64 }}>
                <p style={eyebrow}>
                  {firm.promoEligible ? 'Ready for review' : `Next: ${firm.nextTitle}`}
                </p>
                <div
                  style={{
                    marginTop: 16,
                    background: '#FFFFFF',
                    boxShadow: `inset 0 0 0 1px ${firm.promoEligible ? ACCENT_TEXT : '#e8e4dd'}`,
                    padding: 'clamp(20px, 3.5vw, 32px)',
                  }}
                >
                  {firm.promoEligible && (
                    <p style={{ fontFamily: 'var(--font-room-mono)', fontSize: 13, color: ACCENT_TEXT, margin: '0 0 18px' }}>
                      You&apos;ve cleared every bar for {firm.nextTitle}. The promotion lands on your next
                      completed engagement.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {firm.criteria.map((c) => {
                      const pct = c.target === 0 ? 100 : Math.min(100, Math.round((c.current / c.target) * 100));
                      return (
                        <div key={c.key}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              gap: 8,
                              fontFamily: 'var(--font-room-mono)',
                              fontSize: 12.5,
                            }}
                          >
                            <span style={{ color: INK }}>
                              {c.met ? '✓ ' : ''}
                              {c.label}
                            </span>
                            <span style={{ color: c.met ? ACCENT_TEXT : MUTE, whiteSpace: 'nowrap' }}>
                              {c.current} / {c.target}
                            </span>
                          </div>
                          <div style={{ marginTop: 6 }} aria-hidden="true">
                            <SketchyProgressBar
                              pct={pct}
                              height={18}
                              stroke={INK}
                              fillColor={c.met ? ACCENT : MUTE}
                              roughness={1.5}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* THE LADDER */}
            <section style={{ marginTop: 64 }}>
              <p style={eyebrow}>The ladder</p>
              <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, borderTop: `1px solid ${HAIR}` }}>
                {LEVELS.map((lvl) => {
                  const done = lvl.index < firm.levelIndex;
                  const current = lvl.index === firm.levelIndex;
                  return (
                    <li
                      key={lvl.key}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 16,
                        padding: '16px 0',
                        borderBottom: `1px solid ${HAIR}`,
                        opacity: done ? 0.55 : current ? 1 : 0.4,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontFamily: 'var(--font-room-mono)',
                          fontSize: 11,
                          width: 18,
                          flexShrink: 0,
                          color: current ? ACCENT_TEXT : MUTE,
                        }}
                      >
                        {done ? '✓' : current ? '▸' : lvl.index + 1}
                      </span>
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-room-display)',
                            fontWeight: current ? 700 : 500,
                            fontSize: 'clamp(16px, 2.4vw, 22px)',
                            letterSpacing: '-0.01em',
                            color: INK,
                          }}
                        >
                          {lvl.title}
                          {current && (
                            <span style={{ ...eyebrow, fontSize: 9, marginLeft: 10, color: ACCENT_TEXT }}>
                              you are here
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-room-mono)',
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: MUTE,
                            marginTop: 2,
                            maxWidth: '58ch',
                          }}
                        >
                          {lvl.blurb}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* NEXT ENGAGEMENT — firm-aware: rank sets the difficulty, the Twin
                sets the focus. */}
            <section style={{ marginTop: 64 }}>
              <p style={eyebrow}>Your next engagement</p>
              {engagement ? (
                <div
                  style={{
                    marginTop: 16,
                    background: '#FFFFFF',
                    boxShadow: `inset 0 0 0 1px ${engagement.brief.twinDriven ? ACCENT_TEXT : '#e8e4dd'}`,
                    padding: 'clamp(20px, 3.5vw, 32px)',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-room-serif)',
                      fontWeight: 400,
                      fontStyle: 'italic',
                      fontSize: 'clamp(24px, 3.4vw, 32px)',
                      lineHeight: 1.05,
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    {engagement.caseTitle}
                  </h3>
                  <p style={{ ...eyebrow, marginTop: 12, letterSpacing: '0.14em' }}>
                    {engagement.caseType.replace(/_/g, ' ')} · {engagement.caseDifficulty}
                    {engagement.generated ? ' · generated' : ''}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-room-mono)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: 'rgba(50,50,52,0.82)',
                      margin: '16px 0 0',
                      maxWidth: '56ch',
                    }}
                  >
                    {engagement.brief.rationale}
                  </p>
                  {engagement.brief.focusSkillNames.length > 0 && (
                    <p style={{ ...eyebrow, marginTop: 12, letterSpacing: '0.12em', color: ACCENT_TEXT }}>
                      Focus: {engagement.brief.focusSkillNames.join(' · ')}
                    </p>
                  )}
                  <div style={{ marginTop: 24 }}>
                    <Link
                      href={`/solve/${engagement.caseId}`}
                      style={{
                        background: ACCENT_TEXT,
                        color: '#FFFFFF',
                        borderRadius: 999,
                        padding: '12px 22px',
                        fontFamily: 'var(--font-room-mono)',
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        boxShadow: 'rgba(50,50,52,0.4) 4px 4px 0 0',
                      }}
                    >
                      Take this engagement →
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href="/dashboard"
                    style={{
                      background: ACCENT_TEXT,
                      color: '#FFFFFF',
                      borderRadius: 999,
                      padding: '12px 22px',
                      fontFamily: 'var(--font-room-mono)',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      boxShadow: 'rgba(50,50,52,0.4) 4px 4px 0 0',
                    }}
                  >
                    Take the next engagement →
                  </Link>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
