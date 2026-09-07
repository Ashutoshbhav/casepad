// src/components/skill-profile-card.tsx
//
// The Twin, surfaced on /debrief. PRD v3.1 Stage 1. Directional for now — the
// tracer isn't calibrated to drive scores yet (QWK ~0.65), so this shows bands
// and "areas to work on", never a hard number. Room ("v2") aesthetic: cream
// ground, ink, IBM Plex Mono, one warm accent. Purely presentational; data
// comes from getSkillProfile() in the server component.

import { SKILL_GROUPS, type SkillGroup } from '@/lib/skills/taxonomy';
import type { SkillProfile, SkillProfileEntry } from '@/lib/skills/apply';

const INK = 'rgb(50,50,52)';
const MUTE = 'rgba(50,50,52,0.62)';
const HAIR = 'rgba(0,0,0,0.18)';
const ACCENT = '#f54e00';

function band(estimate: number): { label: string; pct: number } {
  // estimate = Glicko rating - RD. ~1200..1800 in practice; 1500 = start.
  const pct = Math.max(4, Math.min(100, Math.round(((estimate - 1200) / 600) * 100)));
  const label =
    estimate < 1350 ? 'Developing' : estimate < 1500 ? 'Building' : estimate < 1650 ? 'Solid' : 'Strong';
  return { label, pct };
}

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-room-mono, ui-monospace, monospace)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: MUTE,
};

function Row({ e }: { e: SkillProfileEntry }) {
  const { label, pct } = band(e.estimate);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 13, color: INK }}>
          {e.name}
          <span style={{ ...eyebrow, fontSize: 10, marginLeft: 8 }}>{SKILL_GROUPS[e.group]}</span>
        </span>
        <span style={{ fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 11, color: MUTE, whiteSpace: 'nowrap' }}>
          {label}
          {e.provisional ? ' · early read' : ''}
        </span>
      </div>
      <div aria-hidden="true" style={{ marginTop: 5, height: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: e.provisional ? MUTE : ACCENT,
            opacity: e.provisional ? 0.5 : 1,
          }}
        />
      </div>
    </div>
  );
}

export function SkillProfileCard({ profile }: { profile: SkillProfile | null }) {
  if (!profile) return null;
  const anyData = profile.totalObservations > 0;

  return (
    <section style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px #e8e4dd', padding: 'clamp(20px, 3.5vw, 32px)' }}>
      <span style={eyebrow}>Your skill profile</span>
      <div style={{ borderBottom: `1px solid ${HAIR}`, margin: '10px 0 0' }} />

      {!anyData ? (
        <p style={{ marginTop: 14, fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 13, lineHeight: 1.6, color: MUTE }}>
          Finish a few more cases and this fills in — we track ~40 case-interview
          micro-skills across your sessions and show where to focus next.
        </p>
      ) : (
        <>
          <p style={{ margin: '14px 0 22px', fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 12, lineHeight: 1.6, color: MUTE }}>
            Built from {profile.totalObservations} observation
            {profile.totalObservations === 1 ? '' : 's'} across your sessions. Still forming —
            treat these as direction, not a grade.
          </p>

          <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <span style={eyebrow}>Work on next</span>
              <div style={{ marginTop: 14 }}>
                {profile.weakest.map((e) => (
                  <Row key={e.skillId} e={e} />
                ))}
              </div>
            </div>
            <div>
              <span style={eyebrow}>Playing to strength</span>
              <div style={{ marginTop: 14 }}>
                {profile.strongest.map((e) => (
                  <Row key={e.skillId} e={e} />
                ))}
              </div>
            </div>
          </div>

          <GroupSummary profile={profile} />
        </>
      )}
    </section>
  );
}

function GroupSummary({ profile }: { profile: SkillProfile }) {
  const groups = Object.keys(SKILL_GROUPS) as SkillGroup[];
  const rows = groups
    .map((g) => {
      const rated = profile.byGroup[g].filter((e) => e.obsCount > 0);
      if (rated.length === 0) return null;
      const avg = Math.round(rated.reduce((n, e) => n + e.estimate, 0) / rated.length);
      return { g, avg, n: rated.length, total: profile.byGroup[g].length };
    })
    .filter((r): r is { g: SkillGroup; avg: number; n: number; total: number } => r !== null);

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: 26 }}>
      <span style={eyebrow}>By area</span>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(({ g, avg, n, total }) => {
          const { label, pct } = band(avg);
          return (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 13, color: INK, width: 180, flexShrink: 0 }}>
                {SKILL_GROUPS[g]}
              </span>
              <div aria-hidden="true" style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: ACCENT }} />
              </div>
              <span style={{ fontFamily: 'var(--font-room-mono, ui-monospace, monospace)', fontSize: 11, color: MUTE, whiteSpace: 'nowrap' }}>
                {label} · {n}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
