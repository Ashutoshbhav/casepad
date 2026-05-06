'use client';

// /dashboard "This Week" 7-day streak — Wave C surgical port from
// /design-lab/v2/dashboard. Replaces the production rectangle grid
// with v2's sketchy circle row:
//   today    → Onyx Outline #f54e00 (live, your turn now)
//   past     → Aether Blue #5e6ad2 (completed)
//   inactive → muted ink ring
// Sketchy connectors between consecutive completed days glow Aether Blue.

import {
  SketchyCircle,
  SketchyConnector,
} from '@/app/design-lab/v2/_components/sketchy';

type WeekDay = {
  dateISO: string;
  label: string;
  isToday: boolean;
  hasSession: boolean;
};

export function DashboardWeekStreak({ weekDays }: { weekDays: WeekDay[] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {weekDays.map((d, idx) => (
        <div
          key={d.dateISO}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <SketchyCircle
            size={56}
            filled={d.hasSession || d.isToday}
            stroke={
              d.isToday
                ? '#f54e00'
                : d.hasSession
                ? '#5e6ad2'
                : 'rgba(50,50,52,0.40)'
            }
            fillColor={d.isToday ? '#f54e00' : d.hasSession ? '#5e6ad2' : 'transparent'}
            roughness={d.isToday ? 0.8 : 1.4}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono, ui-monospace)',
                fontSize: 10,
                fontWeight: 500,
                color:
                  d.hasSession || d.isToday
                    ? 'rgba(255,255,255,0.92)'
                    : 'rgba(50,50,52,0.55)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
              aria-label={`${d.dateISO}${d.hasSession ? ' active' : ' inactive'}${d.isToday ? ' today' : ''}`}
            >
              {d.isToday ? 'TDY' : d.label}
            </span>
          </SketchyCircle>
          {idx < weekDays.length - 1 && (
            <SketchyConnector
              width={14}
              stroke={
                d.hasSession && weekDays[idx + 1].hasSession
                  ? 'rgba(94,106,210,0.65)'
                  : 'rgba(50,50,52,0.22)'
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
