import 'server-only';
import { createSupabaseAdminClient } from '../supabase/admin';

// Tavily free tier: 1,000 searches/month. We hard-stop at 900 to leave headroom
// for ad-hoc /api/ask-cheatsheet and /api/company-pack calls and to absorb any
// races between the read and the post-call increment. The counter lives in a
// Supabase single-row table (`tavily_quota`) so it survives deploys; an
// in-memory counter would reset on every cold start and defeat the cap.

export const TAVILY_QUOTA_HARD_CAP = 1000;
export const TAVILY_QUOTA_SOFT_CAP = 900;

function currentMonthStartISO(): string {
  const d = new Date();
  // YYYY-MM-01 in UTC.
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

interface QuotaRow {
  id: number;
  month_start: string;
  count: number;
}

async function readQuota(): Promise<QuotaRow | null> {
  try {
    const supa = createSupabaseAdminClient();
    const { data, error } = await supa
      .from('tavily_quota')
      .select('id,month_start,count')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.warn('[tavily-quota] read failed:', error.message);
      return null;
    }
    return data as QuotaRow | null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[tavily-quota] read threw:', msg);
    return null;
  }
}

/**
 * Returns true if we're under the soft cap for the current month. If the row's
 * month_start is stale (new month), resets it to 0 here so subsequent increments
 * land on a fresh counter. On any DB failure we fail-open (allow the call) —
 * the alternative is silently degrading research output for every user.
 */
export async function canCallTavily(): Promise<{ allowed: boolean; count: number; reason?: string }> {
  const monthIso = currentMonthStartISO();
  const row = await readQuota();
  if (!row) return { allowed: true, count: 0, reason: 'quota_table_unavailable' };

  // Roll over to a new month if needed.
  if (row.month_start !== monthIso) {
    try {
      const supa = createSupabaseAdminClient();
      await supa.from('tavily_quota').update({ month_start: monthIso, count: 0 }).eq('id', 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[tavily-quota] month rollover failed:', msg);
    }
    return { allowed: true, count: 0 };
  }

  if (row.count >= TAVILY_QUOTA_SOFT_CAP) {
    return { allowed: false, count: row.count, reason: 'soft_cap_reached' };
  }
  return { allowed: true, count: row.count };
}

/**
 * Increment the counter by `n` (default 1) for the current month. Best-effort —
 * if the DB write fails we log and move on; the next read will catch up.
 */
export async function incrementTavilyQuota(n = 1): Promise<void> {
  const monthIso = currentMonthStartISO();
  try {
    const supa = createSupabaseAdminClient();
    const row = await readQuota();
    if (!row) {
      // Table missing — try to seed and continue.
      await supa.from('tavily_quota').insert({ id: 1, month_start: monthIso, count: n });
      return;
    }
    const newCount = row.month_start === monthIso ? row.count + n : n;
    await supa
      .from('tavily_quota')
      .update({ month_start: monthIso, count: newCount })
      .eq('id', 1);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[tavily-quota] increment failed:', msg);
  }
}
