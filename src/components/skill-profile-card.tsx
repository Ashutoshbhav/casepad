// src/components/skill-profile-card.tsx
//
// The Twin, surfaced on /debrief. PRD v3.1 Stage 1. Directional for now — the
// tracer isn't calibrated yet (gold set in progress), so this shows bands and
// "areas to work on", never a hard number. Purely presentational; the data
// comes from getSkillProfile() in the server component.

import { SKILL_GROUPS, type SkillGroup } from '@/lib/skills/taxonomy';
import type { SkillProfile, SkillProfileEntry } from '@/lib/skills/apply';

function band(estimate: number): { label: string; pct: number } {
  // estimate = Glicko rating - RD. ~1200..1800 in practice; 1500 = start.
  const pct = Math.max(4, Math.min(100, Math.round(((estimate - 1200) / 600) * 100)));
  const label =
    estimate < 1350 ? 'Developing' : estimate < 1500 ? 'Building' : estimate < 1650 ? 'Solid' : 'Strong';
  return { label, pct };
}

function Row({ e }: { e: SkillProfileEntry }) {
  const { label, pct } = band(e.estimate);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-accent)',
            fontSize: 14,
            color: 'var(--color-text-primary)',
          }}
        >
          {e.name}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-text-muted)',
              marginLeft: 8,
            }}
          >
            {SKILL_GROUPS[e.group]}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
          {e.provisional ? ' · early read' : ''}
        </span>
      </div>
      <div
        style={{
          marginTop: 4,
          height: 4,
          background: 'var(--color-bg-sunken)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: e.provisional ? 'var(--color-text-muted)' : 'var(--color-accent)',
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
    <section className="mb-8" style={{ border: '1px solid var(--color-border)', padding: 24 }}>
      <span className="hupr-mono-eyebrow">Your skill profile</span>
      <hr className="hupr-hairline" />

      {!anyData ? (
        <p
          className="mt-3"
          style={{ fontFamily: 'var(--font-accent)', fontSize: 14, color: 'var(--color-text-muted)' }}
        >
          Finish a few more cases and this fills in — we track ~40 case-interview
          micro-skills across your sessions and show where to focus next.
        </p>
      ) : (
        <>
          <p
            className="mt-3 mb-5"
            style={{ fontFamily: 'var(--font-accent)', fontSize: 13, color: 'var(--color-text-muted)' }}
          >
            Built from {profile.totalObservations} observation
            {profile.totalObservations === 1 ? '' : 's'} across your sessions. Still forming —
            treat these as direction, not a grade.
          </p>

          <div className="grid md:grid-cols-2 gap-x-10">
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Work on next
              </span>
              <div className="mt-3">
                {profile.weakest.map((e) => (
                  <Row key={e.skillId} e={e} />
                ))}
              </div>
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Playing to strength
              </span>
              <div className="mt-3">
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
    <div className="mt-6">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-text-muted)',
        }}
      >
        By area
      </span>
      <div className="mt-3 space-y-2">
        {rows.map(({ g, avg, n, total }) => {
          const { label, pct } = band(avg);
          return (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontFamily: 'var(--font-accent)',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  width: 200,
                  flexShrink: 0,
                }}
              >
                {SKILL_GROUPS[g]}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: 'var(--color-bg-sunken)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)' }} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label} · {n}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
