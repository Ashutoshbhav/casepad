// Pure budget-decision logic — NO 'server-only' guard so it's unit-testable and
// importable anywhere. The DB-backed increment lives in llm-budget.ts (server).

export const GLOBAL_CAP = Number(process.env.LLM_DAILY_GLOBAL_CAP ?? 4000);
export const PER_USER_CAP = Number(process.env.LLM_DAILY_PER_USER_CAP ?? 120);

export interface BudgetResult {
  allowed: boolean;
  scope?: 'global' | 'user';
  globalCount?: number;
  userCount?: number;
}

/**
 * Pure decision: given the post-increment counts, is this call within budget?
 * Global cap is checked first (protects the whole app), then per-user. Only a
 * count STRICTLY ABOVE the cap trips it (== cap is still allowed).
 */
export function decideBudget(
  globalCount: number,
  userCount: number,
  caps: { global: number; user: number } = { global: GLOBAL_CAP, user: PER_USER_CAP }
): BudgetResult {
  if (Number.isFinite(globalCount) && globalCount > caps.global) {
    return { allowed: false, scope: 'global', globalCount, userCount };
  }
  if (Number.isFinite(userCount) && userCount > caps.user) {
    return { allowed: false, scope: 'user', globalCount, userCount };
  }
  return { allowed: true, globalCount, userCount };
}
