import 'server-only';
import { createSupabaseAdminClient } from '../supabase/admin';
import { decideBudget, type BudgetResult } from './llm-budget-core';

// Global + per-user daily LLM caps — the public-launch circuit breaker.
// Counts chat turns (the dominant LLM-cost vector). Backed by the llm_usage
// table + bump_llm_usage RPC (migration 0018), so the count survives Vercel
// cold-starts (the in-memory rate limiter does not) and is race-safe under a
// concurrent public flood.
//
// FAIL-OPEN by design (Fortress): any DB/RPC error => allowed. And until the
// migration is applied, the RPC 404s => allowed => unchanged behavior. Tune the
// caps via Vercel env without a redeploy. Pure decision logic + caps live in
// ./llm-budget-core (unit-tested; no 'server-only' guard).

export { decideBudget } from './llm-budget-core';
export type { BudgetResult } from './llm-budget-core';

/** UTC day bucket as YYYY-MM-DD (matches the migration's `date` column). */
function todayUTC(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

/**
 * Atomically increment the global + per-user daily counters and decide whether
 * this call is within budget. Fail-open on any error.
 */
export async function bumpAndCheckLlmBudget(userId: string): Promise<BudgetResult> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('bump_llm_usage', {
      p_user: userId,
      p_day: todayUTC(),
      p_n: 1,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      // RPC missing (migration not yet applied) or transient error → fail open.
      return { allowed: true };
    }
    const row = data[0] as { global_count: number; user_count: number };
    return decideBudget(Number(row.global_count), Number(row.user_count));
  } catch {
    return { allowed: true };
  }
}
