'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { isMissingTable } from '@/lib/supabase/missing-table';

// User-submitted ("bring your own case") creation server action.
//
// Writes to the cases table with is_user_case=true + user_id=auth.uid().
// RLS on the table (migration 0015) enforces ownership; no service-role
// client needed.
//
// On success: redirects directly into the solve flow for the new case so
// the user is one click from practicing what they typed.
//
// Fail-open semantics: if migration 0015 isn't applied yet (user_id /
// is_user_case columns missing), the insert errors with code 42703
// (undefined_column) — we surface a clean "not_ready" reason. Until
// applied, the form will look like it works but the redirect won't fire
// and the user will see the not-ready toast.

export type CaseTypeKind =
  | 'profitability'
  | 'market_entry'
  | 'operations'
  | 'estimation'
  | 'pricing'
  | 'mna'
  | 'gtm'
  | 'other';

export type DifficultyKind = 'easy' | 'medium' | 'hard' | 'expert';

export type IndustryKind =
  | 'consulting'
  | 'fmcg'
  | 'tech'
  | 'healthcare'
  | 'finance'
  | 'infra'
  | 'energy'
  | 'retail'
  | 'other';

export interface CreateUserCaseInput {
  title: string;
  problemStatement: string;
  caseType: CaseTypeKind;
  difficulty: DifficultyKind;
  industry: IndustryKind;
}

export type CreateUserCaseResult =
  | { ok: true; caseId: string }
  | { ok: false; reason: 'auth' }
  | { ok: false; reason: 'not_ready' } // migration 0015 unapplied
  | { ok: false; reason: 'invalid'; message: string }
  | { ok: false; reason: 'error'; message: string };

const CASE_TYPES: readonly CaseTypeKind[] = [
  'profitability', 'market_entry', 'operations',
  'estimation', 'pricing', 'mna', 'gtm', 'other',
];
const DIFFICULTIES: readonly DifficultyKind[] = ['easy', 'medium', 'hard', 'expert'];
const INDUSTRIES: readonly IndustryKind[] = [
  'consulting', 'fmcg', 'tech', 'healthcare', 'finance',
  'infra', 'energy', 'retail', 'other',
];

// Detect the "column does not exist" condition (migration 0015 unapplied).
// Distinct from isMissingTable — the table exists, just without the new
// user_id / is_user_case columns. Postgres returns code 42703.
function isMissingColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42703') return true;
  const msg = String(e.message ?? '').toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

export async function createUserCase(
  input: CreateUserCaseInput
): Promise<CreateUserCaseResult> {
  // --- validation (manual, matches project convention) ---
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return { ok: false, reason: 'invalid', message: 'Title is required.' };
  }
  if (title.length > 120) {
    return { ok: false, reason: 'invalid', message: 'Title is too long (max 120 chars).' };
  }

  const problemStatement = typeof input?.problemStatement === 'string'
    ? input.problemStatement.trim()
    : '';
  // 100 char floor — anything shorter is unlikely to be a real case prompt
  // and won't give the interviewer enough to ground in. 5000 char ceiling
  // because real casebook prompts top out around 800-1200; 5000 is generous
  // headroom + abuse cap.
  if (problemStatement.length < 100) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Problem statement is too short — aim for at least 100 characters of context.',
    };
  }
  if (problemStatement.length > 5000) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Problem statement is too long (max 5000 chars).',
    };
  }
  // Strip control chars (defang weird unicode) but preserve newlines/tabs
  const safeProblem = problemStatement.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (!safeProblem) {
    return { ok: false, reason: 'invalid', message: 'Problem statement is empty after sanitization.' };
  }

  if (!CASE_TYPES.includes(input?.caseType)) {
    return { ok: false, reason: 'invalid', message: 'Pick a valid case type.' };
  }
  if (!DIFFICULTIES.includes(input?.difficulty)) {
    return { ok: false, reason: 'invalid', message: 'Pick a valid difficulty.' };
  }
  if (!INDUSTRIES.includes(input?.industry)) {
    return { ok: false, reason: 'invalid', message: 'Pick a valid industry.' };
  }

  // --- auth ---
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' };

  // --- insert ---
  // We use the user-scoped client (NOT service-role) so RLS enforces
  // ownership: the with_check policy on cases requires is_user_case=true
  // AND user_id=auth.uid().
  const { data, error } = await withRetry(() =>
    supabase
      .from('cases')
      .insert({
        title: title.slice(0, 120),
        problem_statement: safeProblem,
        case_type: input.caseType,
        difficulty: input.difficulty,
        industry: input.industry,
        source: 'user-submitted',
        user_id: user.id,
        is_user_case: true,
        // interviewer_notes + ideal_structure default to empty per schema —
        // the interviewer will run free-form without curated reveals.
      })
      .select('id')
      .single()
  );

  if (error) {
    if (isMissingTable(error) || isMissingColumn(error)) {
      return { ok: false, reason: 'not_ready' };
    }
    return { ok: false, reason: 'error', message: error.message || 'Could not save.' };
  }
  if (!data?.id) {
    return { ok: false, reason: 'error', message: 'Insert succeeded but no id returned.' };
  }

  revalidatePath('/cases');
  // The redirect throws NEXT_REDIRECT which Next.js handles — we never
  // actually return ok:true to the form, but it's typed for completeness
  // (e.g. if the action is ever called outside a Server Action context).
  redirect(`/solve/${data.id}`);
}
