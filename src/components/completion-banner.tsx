// Server-rendered completion banner for /debrief. Sits above the
// ScoreReveal animation as a "you just did this" stat strip — XP earned
// this session, current streak in days, total cases done. No animation,
// no auto-dismiss, no localStorage gate. The score-reveal animation
// itself carries the celebration; this strip carries the *context*.
//
// Why the celebration moment matters: cohort retention research said
// users need a clear "I did the thing" beat at completion, not just a
// score number. This strip is that beat.

import { headlineFor } from '@/lib/streak-copy';

export function CompletionBanner({
  xpEarned,
  streakDays,
  totalCompleted,
  isNewRecord,
}: {
  xpEarned: number;
  streakDays: number;
  totalCompleted: number;
  isNewRecord?: boolean;
}) {
  const headline = headlineFor(streakDays, isNewRecord ?? false);

  return (
    <div
      className="mb-6 mt-2 p-4 sm:p-5 grid grid-cols-3 gap-2 sm:gap-4"
      style={{
        // Wave C: v2-flavor warm-dark stat card. Matches /dashboard
        // recent reps + cohort leaderboard surface.
        background: '#1a1817',
        color: '#faf9f5',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
      }}
      data-tour="debrief-completion-banner"
      aria-label="Session completion summary"
    >
      <Stat
        label="XP earned"
        value={`+${xpEarned}`}
        accent
      />
      <Stat
        label={isNewRecord ? 'Streak (new!)' : 'Streak'}
        value={streakDays > 0 ? `${streakDays} day${streakDays === 1 ? '' : 's'}` : '—'}
      />
      <Stat
        label="Cases done"
        value={totalCompleted.toString()}
      />
      {/* Headline strip on second row, full-width — Ash's voice on the moment. */}
      <p
        className="col-span-3 mt-2 sm:mt-3 font-headline italic text-sm sm:text-base"
        style={{ color: 'rgba(250,249,245,0.85)' }}
      >
        {headline}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span
        className="font-mono text-[10px] uppercase truncate"
        style={{
          color: 'rgba(250,249,245,0.55)',
          letterSpacing: '0.22em',
        }}
      >
        {label}
      </span>
      <span
        className="font-headline italic text-xl sm:text-2xl truncate"
        style={{
          color: accent ? '#f54e00' : '#faf9f5',
        }}
      >
        {value}
      </span>
    </div>
  );
}
