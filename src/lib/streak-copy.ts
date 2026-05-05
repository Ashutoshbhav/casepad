// One-line copy generator for the completion banner. Stays in Ash's
// voice — terse, time-conscious, doesn't over-praise. The streak value
// AND a "first session ever" / "personal record" flag steer the line.
// Pure function so it lives next to the heuristic; the banner reads it.

export function headlineFor(streakDays: number, isNewRecord: boolean): string {
  if (streakDays === 0) return 'One in the books. Tomorrow we line up the next one.';
  if (streakDays === 1) return 'Day one of your streak. Show up tomorrow and it grows.';
  if (isNewRecord) return `${streakDays} days. Your longest run yet.`;
  if (streakDays >= 7) return `${streakDays} days. Streaks like this is how reps compound.`;
  if (streakDays >= 3) return `${streakDays}-day streak. Keep showing up.`;
  return `${streakDays}-day streak. Keep it alive.`;
}

// Compute how many consecutive calendar days, ending today (in IST), the
// user has at least one completed session. Returns 0 if no completion
// today. The "session that was just completed" caller must pass an
// already-completed list, OR include today's completion in the dates
// array. We don't fetch — caller passes pre-fetched ISO timestamps.
export function streakDaysFromTimestamps(
  completedAtIso: readonly (string | Date)[],
  todayIst?: Date
): number {
  if (completedAtIso.length === 0) return 0;
  const today = todayIst ?? new Date();
  // Convert each timestamp to IST date string (YYYY-MM-DD).
  const dates = new Set<string>();
  for (const t of completedAtIso) {
    const d = typeof t === 'string' ? new Date(t) : t;
    dates.add(toIstDateKey(d));
  }
  let streak = 0;
  let cursor = new Date(today);
  for (let i = 0; i < 365; i += 1) {
    const key = toIstDateKey(cursor);
    if (dates.has(key)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function toIstDateKey(d: Date): string {
  // IST = UTC+5:30. We add 5h30m to the UTC date and read its UTC parts —
  // that gives us the date in the user's IST timezone without depending on
  // the server's TZ.
  const istMs = d.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
