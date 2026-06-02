import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// C4 (2026-06-02): production failure telemetry. The backend had ZERO
// observability — every failure was an ephemeral console.warn on Vercel, so
// Ash could only learn the NSM broke when a user complained. This records
// NSM-fatal failures (all-providers-down, transcript-save-failed, evaluator
// persistence-failed, etc.) into a queryable `nsm_failures` table.
//
// Design rules:
//  - FAIL-OPEN: telemetry must NEVER break the request path. Every error here
//    (incl. the table not existing yet because the migration isn't applied) is
//    swallowed to console. Call it as `void logFailure(...)` — never await it
//    on the hot path.
//  - Uses the service-role admin client so the insert bypasses RLS (the table
//    is deny-all to anon/auth — see migration 0016_nsm_failures.sql).
// See docs/BACKEND-AUDIT-2026-06-02.md (C4).

export type NsmFailureRoute =
  | 'chat'
  | 'evaluate'
  | 'cheatsheet'
  | 'issue-tree'
  | 'start-session'
  | 'end-session'
  | 'voice'
  | 'tavily'
  | 'other';

export async function logFailure(
  route: NsmFailureRoute | string,
  err: unknown,
  ctx?: { sessionId?: string; userId?: string; detail?: string }
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const message = err instanceof Error ? err.message : String(err);
    await admin.from('nsm_failures').insert({
      route,
      session_id: ctx?.sessionId ?? null,
      user_id: ctx?.userId ?? null,
      error: message.slice(0, 1000),
      detail: ctx?.detail?.slice(0, 1000) ?? null,
    });
  } catch (e) {
    // Fail-open. If this fires repeatedly the migration likely isn't applied.
    console.error('[logFailure] could not record failure:', (e as Error).message);
  }
}
