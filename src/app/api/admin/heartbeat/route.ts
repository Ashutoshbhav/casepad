// src/app/api/admin/heartbeat/route.ts
//
// Pure keep-alive ping — separate from smoke-check on purpose. smoke-check
// asserts the PRODUCT works (real case, real chat turn, real LLM reply) and
// fails loudly the moment content or the fortress breaks. That's correct for
// catching regressions, but it means the one thing scheduled to run
// regularly also stops touching Supabase/Upstash the instant something else
// breaks (e.g. an empty cases table) — exactly when we most need the
// free-tier projects to still look "active" so they don't ALSO get
// auto-paused on top of whatever the real incident is.
//
// This route proves each backing service is reachable, independent of app
// content: Supabase Auth (listUsers, page size 1 — cheap, RLS-bypassing,
// unaffected by any table's row count) and Upstash Redis (a real rateLimit()
// call through the same path /api/chat uses, so it isn't just the in-memory
// fallback). Neither depends on a content/data bug — that's the point.
//
// It ALSO does one deliberate write: a single-row upsert into `keepalive`
// (migration 0020) bumping last_ping_at / ping_count. Reads almost certainly
// already count as Supabase activity, but a write removes all doubt about the
// free-tier 7-day inactivity-pause criteria, and `select * from keepalive`
// becomes a one-line "when was this last kept awake, by what". The write is
// best-effort: if the table isn't there yet it's reported, not fatal.
//
// Redundant schedules, on purpose (every prior pause was the ONE scheduler
// silently failing with nothing watching):
//   - Vercel Cron, daily 03:00 UTC        (vercel.json)
//   - GitHub Actions, every 6h            (.github/workflows/keepalive.yml)
// The GH job fails loudly (→ GitHub emails Ash) if this returns non-200, so
// a broken keep-alive surfaces in hours, not after a 7-day pause.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 15;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(req: NextRequest) {
  // Accept either SMOKE_CHECK_TOKEN (external routine) or CRON_SECRET
  // (auto-injected by Vercel Cron as `Authorization: Bearer $CRON_SECRET`).
  // Checked independently — they need not share a value, so the
  // Vercel-native cron authenticates this route on its own.
  const accepted = [process.env.SMOKE_CHECK_TOKEN, process.env.CRON_SECRET].filter(
    (v): v is string => !!v,
  );
  if (accepted.length === 0) {
    return jsonError(501, 'neither SMOKE_CHECK_TOKEN nor CRON_SECRET configured on this deployment');
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const bearerOk = !!provided && accepted.some((tok) => safeEqual(provided, tok));

  // UA fallback for the two schedulers that can't easily carry a secret:
  //   - `vercel-cron/*`     — Vercel Cron only attaches a bearer when a
  //     CRON_SECRET env var exists, and setting it has been the manual step
  //     that repeatedly did not happen (pause incidents #2, #3, #4).
  //   - `casepad-keepalive/*` — the GitHub Actions keep-alive job, so it
  //     needs no repo secret to set up.
  // This endpoint's whole blast radius is: a page-1/size-1 listUsers, a
  // rate-limit round trip, and one upsert of a single ops row. Rate-limited
  // to 30/hr. Nothing sensitive is read or returned. The bearer path stays
  // the strong check for any other caller.
  const ua = req.headers.get('user-agent') || '';
  const isKnownScheduler = /^vercel-cron\//i.test(ua) || /^casepad-keepalive\//i.test(ua);

  if (!bearerOk && !isKnownScheduler) {
    return jsonError(401, 'unauthorized');
  }

  const source = new URL(req.url).searchParams.get('source') || ua.split(/[/\s]/)[0] || 'unknown';

  // Same token as smoke-check but its own bucket — this one is meant to be
  // hit at least as often, never blocked by smoke-check's own cap.
  const rl = checkRateLimit('heartbeat', 30, 60 * 60 * 1000);
  if (!rl.ok) return jsonError(429, `rate limited — retry after ${rl.retryAfterSec}s`);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonError(500, 'missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  const results: { supabase?: string; keepalive?: string; upstash?: string } = {};
  let failed = false;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    results.supabase = 'ok';
  } catch (err) {
    failed = true;
    results.supabase = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Deliberate write — see header comment. Best-effort: a missing table
  // (migration 0020 not applied yet) is reported, not counted as a failure,
  // since the listUsers read above already keeps the project active.
  try {
    const { data: cur } = await admin
      .from('keepalive')
      .select('ping_count')
      .eq('id', 1)
      .maybeSingle();
    const { error } = await admin.from('keepalive').upsert(
      {
        id: 1,
        last_ping_at: new Date().toISOString(),
        ping_count: (cur?.ping_count ?? 0) + 1,
        last_source: source,
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    results.keepalive = `ok (source=${source}, count=${(cur?.ping_count ?? 0) + 1})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.keepalive = /does not exist|Could not find the table/i.test(msg)
      ? 'table missing — apply migration 0020_keepalive.sql'
      : `write failed: ${msg}`;
  }

  try {
    // Large max/window — this must never actually throttle anything, it
    // only needs to exercise a real Upstash round trip when configured.
    const r = await rateLimit('heartbeat:daily-ping', 1_000_000, 24 * 60 * 60 * 1000);
    results.upstash = r.ok ? 'ok (or in-memory fallback if Upstash env unset)' : 'unexpectedly rate-limited';
  } catch (err) {
    failed = true;
    results.upstash = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ ok: !failed, results }, { status: failed ? 502 : 200 });
}
