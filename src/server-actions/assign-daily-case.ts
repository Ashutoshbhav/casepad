import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { STARTER_CASE_IDS } from '@/lib/starter-cases';
import type { Track } from '@/lib/tracks';

// Anticipation Hook (Stream 2):
// Pick exactly ONE case for the user for "today" (IST date) and persist it
// into daily_assignments. Idempotent per (user_id, assigned_for) thanks to the
// table's compound primary key — the upsert with ignoreDuplicates is a no-op
// on re-runs same day.
//
// Picker order (LLM-free, pure SQL):
//   1. <10 starter sessions completed → next un-done starter from
//      STARTER_CASE_IDS (the curated 10).
//   2. Has a clear weak case_type (avg <65 over >=2 sessions) → match a case
//      in user's preferred_track on that case_type, not yet attempted, prefer
//      pre_case_crammer cached.
//   3. Else → any case in preferred_track not yet attempted, prefer cached
//      crammer content.
//   4. preferred_track absent → consulting default.
//
// The algorithm is deterministic-ish: ordering is by a stable signal
// (created_at desc with crammer-cached pinned to top), so re-runs same day
// before insert produce the same pick. Once stored, the row is the source
// of truth for that date — no re-rolls.

export interface DailyAssignment {
  caseId: string;
  reason: string;
  assignmentDate: string; // YYYY-MM-DD in IST
  caseTitle: string;
  caseDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  caseType: string;
  startedSessionId: string | null;
}

// IST calendar date — the user's day boundary, not UTC.
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

interface SessionRow {
  case_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  score: number | null;
  cases: { case_type: string } | null;
}

interface CaseRow {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  case_type: string;
  pre_case_crammer: unknown;
}

export async function assignDailyCase(
  userId: string,
  preferredTrack: Track | null
): Promise<DailyAssignment | null> {
  const supa = createSupabaseAdminClient();
  const today = todayIST();
  const track: Track = preferredTrack ?? 'consulting';

  // 1. Existing row for today? Return as-is (idempotency).
  const existing = await supa
    .from('daily_assignments')
    .select('case_id, reason, started_session_id, cases(title, difficulty, case_type)')
    .eq('user_id', userId)
    .eq('assigned_for', today)
    .maybeSingle();

  // If the table doesn't exist yet (migration not applied), bail quietly so
  // the dashboard renders without the card rather than 500-ing.
  if (existing.error) {
    const code = (existing.error as { code?: string }).code;
    if (code === '42P01' /* undefined_table */ || code === 'PGRST205') {
      console.warn('[assign-daily-case] daily_assignments table missing — skipping');
      return null;
    }
    console.warn('[assign-daily-case] read error:', existing.error.message);
    return null;
  }

  if (existing.data) {
    const c = (existing.data as unknown as { cases: { title: string; difficulty: DailyAssignment['caseDifficulty']; case_type: string } | null }).cases;
    if (!c) return null;
    return {
      caseId: existing.data.case_id,
      reason: existing.data.reason,
      assignmentDate: today,
      caseTitle: c.title,
      caseDifficulty: c.difficulty,
      caseType: c.case_type,
      startedSessionId: (existing.data as { started_session_id: string | null }).started_session_id,
    };
  }

  // 2. Pull user's session history once — reused by all picker branches.
  const { data: sessionsRaw } = await supa
    .from('sessions')
    .select('case_id, status, score, cases(case_type)')
    .eq('user_id', userId)
    .limit(500);
  const sessions: SessionRow[] = (sessionsRaw ?? []) as unknown as SessionRow[];
  const attemptedIds = new Set(sessions.map((s) => s.case_id));
  const completed = sessions.filter((s) => s.status === 'completed');

  // 3. Decide which case to pick.
  const pick = await pickCase({ supa, sessions, completed, attemptedIds, track });
  if (!pick) {
    console.warn('[assign-daily-case] no case found for user', userId);
    return null;
  }

  // 4. Insert. ignoreDuplicates protects against a same-millisecond double-render.
  const insert = await supa
    .from('daily_assignments')
    .upsert(
      {
        user_id: userId,
        assigned_for: today,
        case_id: pick.caseRow.id,
        reason: pick.reason,
      },
      { onConflict: 'user_id,assigned_for', ignoreDuplicates: true }
    );
  if (insert.error) {
    console.warn('[assign-daily-case] insert error:', insert.error.message);
    return null;
  }

  return {
    caseId: pick.caseRow.id,
    reason: pick.reason,
    assignmentDate: today,
    caseTitle: pick.caseRow.title,
    caseDifficulty: pick.caseRow.difficulty,
    caseType: pick.caseRow.case_type,
    startedSessionId: null,
  };
}

interface PickResult {
  caseRow: CaseRow;
  reason: string;
}

async function pickCase(args: {
  supa: ReturnType<typeof createSupabaseAdminClient>;
  sessions: SessionRow[];
  completed: SessionRow[];
  attemptedIds: Set<string>;
  track: Track;
}): Promise<PickResult | null> {
  const { supa, completed, attemptedIds, track } = args;

  // Branch A: starter — fewer than 10 starter cases completed.
  const completedStarterCount = completed.filter((s) =>
    STARTER_CASE_IDS.includes(s.case_id)
  ).length;

  if (completedStarterCount < 10) {
    // Pick the next un-attempted starter (preserving the curated order).
    const nextStarterId = STARTER_CASE_IDS.find((id) => !attemptedIds.has(id));
    if (nextStarterId) {
      const { data: caseRow } = await supa
        .from('cases')
        .select('id, title, difficulty, case_type, pre_case_crammer')
        .eq('id', nextStarterId)
        .maybeSingle();
      if (caseRow) {
        const pos = STARTER_CASE_IDS.indexOf(nextStarterId) + 1;
        const reason =
          pos === 1
            ? 'Starter 1/10 — your first case'
            : `Starter ${pos}/10`;
        return { caseRow: caseRow as CaseRow, reason };
      }
    }
    // Fall through if all starters attempted but completed_count <10 (some
    // were abandoned/in-progress). Then weak-spot or general path takes over.
  }

  // Branch B: weak-spot — find avg score per case_type, pick weakest with
  // n>=2 and avg<65, then pick a track-matching case of that type.
  const byType: Record<string, { sum: number; n: number }> = {};
  for (const s of completed) {
    const t = s.cases?.case_type ?? 'other';
    byType[t] = byType[t] ?? { sum: 0, n: 0 };
    byType[t].sum += s.score ?? 0;
    byType[t].n += 1;
  }
  const weak = Object.entries(byType)
    .map(([t, v]) => ({ type: t, avg: Math.round(v.sum / v.n), n: v.n }))
    .filter((w) => w.avg < 65 && w.n >= 2)
    .sort((a, b) => a.avg - b.avg);

  if (weak.length > 0) {
    const target = weak[0];
    const candidate = await fetchCandidate({
      supa,
      track,
      caseType: target.type,
      excludeIds: attemptedIds,
    });
    if (candidate) {
      const prettyType = target.type.replace(/_/g, ' ');
      return {
        caseRow: candidate,
        reason: `You scored ${target.avg} on ${prettyType} — here's another`,
      };
    }
  }

  // Branch C: general — any track-matching un-attempted case.
  const general = await fetchCandidate({
    supa,
    track,
    caseType: null,
    excludeIds: attemptedIds,
  });
  if (general) {
    return {
      caseRow: general,
      reason: `Today's pick from your ${track === 'ib_pe_vc' ? 'IB / PE' : track.replace(/_/g, ' ')} track`,
    };
  }

  return null;
}

// Pull one case matching the track (and optionally a case_type), excluding
// already-attempted ids. Prefer cases with cached pre_case_crammer so the
// solve experience is instant.
async function fetchCandidate(args: {
  supa: ReturnType<typeof createSupabaseAdminClient>;
  track: Track;
  caseType: string | null;
  excludeIds: Set<string>;
}): Promise<CaseRow | null> {
  const { supa, track, caseType, excludeIds } = args;

  const baseSelect = 'id, title, difficulty, case_type, pre_case_crammer';

  // First pass: cached crammer cases.
  let q1 = supa
    .from('cases')
    .select(baseSelect)
    .contains('tracks', [track])
    .not('pre_case_crammer', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (caseType) q1 = q1.eq('case_type', caseType);
  const r1 = await q1;
  const cached = ((r1.data ?? []) as unknown as CaseRow[]).filter(
    (c) => !excludeIds.has(c.id)
  );
  if (cached.length > 0) return cached[0];

  // Second pass: any case in track.
  let q2 = supa
    .from('cases')
    .select(baseSelect)
    .contains('tracks', [track])
    .order('created_at', { ascending: false })
    .limit(100);
  if (caseType) q2 = q2.eq('case_type', caseType);
  const r2 = await q2;
  const any = ((r2.data ?? []) as unknown as CaseRow[]).filter(
    (c) => !excludeIds.has(c.id)
  );
  if (any.length > 0) return any[0];

  // If case_type filter starved the result, retry without it.
  if (caseType) {
    return fetchCandidate({ ...args, caseType: null });
  }
  return null;
}

// Estimated solve duration based on difficulty. Sourced from the project's
// existing solve-page UX expectations; not a benchmark — a planning hint.
export function estimatedMinutes(difficulty: DailyAssignment['caseDifficulty']): number {
  switch (difficulty) {
    case 'easy':
      return 18;
    case 'medium':
      return 22;
    case 'hard':
      return 28;
    case 'expert':
      return 35;
    default:
      return 22;
  }
}
