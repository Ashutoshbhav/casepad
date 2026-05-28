'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { isMissingTable } from '@/lib/supabase/missing-table';

export type OutcomeKind = 'offered' | 'rejected' | 'pending' | 'withdrew';

export interface LogInterviewOutcomeInput {
  firm: string;
  role?: string | null;
  interviewDate: string; // YYYY-MM-DD
  round?: string | null;
  outcome: OutcomeKind;
  asked?: string | null;
  caseTopics?: string[];
  verification?: string | null;
  preparedWithCasepad?: boolean;
  source?: string;
}

export type LogInterviewOutcomeResult =
  | { ok: true }
  | { ok: false; reason: 'not_ready' } // migration 0014 not applied yet
  | { ok: false; reason: 'auth' }
  | { ok: false; reason: 'invalid'; message: string }
  | { ok: false; reason: 'error'; message: string };

const OUTCOMES: readonly OutcomeKind[] = ['offered', 'rejected', 'pending', 'withdrew'];

export async function logInterviewOutcome(
  input: LogInterviewOutcomeInput
): Promise<LogInterviewOutcomeResult> {
  // --- validation (manual, matches project convention — no zod) ---
  const firm = typeof input?.firm === 'string' ? input.firm.trim() : '';
  if (!firm || firm.length > 120) {
    return { ok: false, reason: 'invalid', message: 'Firm is required (≤120 chars).' };
  }

  const role =
    typeof input.role === 'string' && input.role.trim()
      ? input.role.trim().slice(0, 120)
      : null;

  const interviewDate = typeof input?.interviewDate === 'string' ? input.interviewDate : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) {
    return { ok: false, reason: 'invalid', message: 'Interview date is required.' };
  }
  if (Number.isNaN(new Date(`${interviewDate}T00:00:00Z`).getTime())) {
    return { ok: false, reason: 'invalid', message: 'Interview date is not a valid date.' };
  }
  // Date-only field — compare as ISO strings, never construct a UTC instant.
  // Constructing `${date}T00:00:00Z` and comparing to Date.now() shifts a
  // same-day interview into "the future" for any client ahead of UTC (IST
  // users before 05:30 would have a real same-day offer rejected).
  const oneYearAhead = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (interviewDate < '2020-01-01' || interviewDate > oneYearAhead) {
    return { ok: false, reason: 'invalid', message: 'Interview date is out of range.' };
  }

  if (!OUTCOMES.includes(input?.outcome)) {
    return { ok: false, reason: 'invalid', message: 'Pick an outcome.' };
  }
  // A clearly-future interview can't already have a result. +1-day grace on
  // "today" so a client ahead of UTC is never told its same-day interview
  // is in the future.
  const todayPlusGrace = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (interviewDate > todayPlusGrace && input.outcome !== 'pending') {
    return {
      ok: false,
      reason: 'invalid',
      message: 'A future interview can only be logged as “Awaiting result”.',
    };
  }

  const round =
    typeof input.round === 'string' && input.round.trim()
      ? input.round.trim().slice(0, 40)
      : null;

  const asked =
    typeof input.asked === 'string' && input.asked.trim()
      ? input.asked.trim().slice(0, 5000)
      : null;

  const verification =
    typeof input.verification === 'string' && input.verification.trim()
      ? input.verification.trim().slice(0, 5000)
      : null;

  const caseTopics = Array.isArray(input.caseTopics)
    ? input.caseTopics
        .filter((t) => typeof t === 'string' && t.trim())
        .slice(0, 20)
        .map((t) => t.trim().slice(0, 60))
    : [];

  const source =
    typeof input.source === 'string' && input.source.trim()
      ? input.source.trim().slice(0, 20)
      : 'outcomes';

  // --- auth ---
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' };

  // --- insert ---
  const { error } = await withRetry(() =>
    supabase
      .from('interview_outcomes')
      .insert({
        user_id: user.id,
        firm: firm.slice(0, 120),
        role,
        interview_date: interviewDate,
        round,
        outcome: input.outcome,
        asked,
        case_topics: caseTopics,
        verification,
        prepared_with_casepad: input.preparedWithCasepad === true,
        source,
      })
      .select('id')
      .single()
  );

  if (error) {
    // Fail open exactly like the dossier path: until migration 0014 is
    // applied this is a no-op, never a crash.
    if (isMissingTable(error)) return { ok: false, reason: 'not_ready' };
    return { ok: false, reason: 'error', message: error.message || 'Could not save.' };
  }

  revalidatePath('/outcomes');
  revalidatePath('/dashboard');
  return { ok: true };
}
