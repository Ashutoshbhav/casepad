'use client';

// Wave C: 3-up sketchy progress bars on /debrief, replacing the
// linear ScoreBar instances. Each sub-score gets its own meaning-
// colour hachure fill (Wave 5 pattern):
//   Structure → orange #f54e00 (active work / structure muscle)
//   Insight   → Aether Blue #5e6ad2 (wisdom, depth, considered)
//   Speed     → Fire Opal #f65726 (urgency, time)

import { SketchyProgressBar } from '@/app/design-lab/v2/_components/sketchy';

const COLORS = {
  Structure: '#f54e00',
  Insight: '#5e6ad2',
  Speed: '#f65726',
} as const;

type Row = { label: 'Structure' | 'Insight' | 'Speed'; value: number; max: number };

export function DebriefSketchyScores({
  structure,
  insight,
  speed,
}: {
  structure: number;
  insight: number;
  speed: number;
}) {
  const rows: Row[] = [
    { label: 'Structure', value: structure, max: 40 },
    { label: 'Insight', value: insight, max: 40 },
    { label: 'Speed', value: speed, max: 20 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {rows.map((s) => {
        const pct = (s.value / s.max) * 100;
        return (
          <div key={s.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-headline, ui-serif)',
                  fontStyle: 'italic',
                  fontSize: 24,
                  fontWeight: 400,
                  color: 'var(--color-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.value}
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--color-text-muted)',
                    marginLeft: 6,
                  }}
                >
                  / {s.max}
                </span>
              </span>
            </div>
            <SketchyProgressBar
              pct={pct}
              height={26}
              stroke="var(--color-text-primary)"
              fillColor={COLORS[s.label]}
              roughness={1.5}
            />
          </div>
        );
      })}
    </div>
  );
}
