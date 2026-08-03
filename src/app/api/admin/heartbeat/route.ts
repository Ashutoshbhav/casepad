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
// This route only proves each backing service is reachable, independent of
// app content: Supabase Auth (listUsers, page size 1 — cheap, RLS-bypassing,
// unaffected by any table's row count) and Upstash Redis (a real rateLimit()
// call through the same path /api/chat uses, so it isn't just the in-memory
// fallback). No app tables are read or written, so it can't fail because of
// a content/data bug — that's the point.
//
// Scheduled every 2h via the same routine that runs smoke-check, on a
// separate leg so this one still fires even if the smoke-check leg fails.

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
  const expected = process.env.SMOKE_CHECK_TOKEN;
  if (!expected) return jsonError(501, 'SMOKE_CHECK_TOKEN not configured on this deployment');

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!provided || !safeEqual(provided, expected)) {
    return jsonError(401, 'unauthorized');
  }

  // Same token as smoke-check but its own bucket — this one is meant to be
  // hit at least as often, never blocked by smoke-check's own cap.
  const rl = checkRateLimit('heartbeat', 30, 60 * 60 * 1000);
  if (!rl.ok) return jsonError(429, `rate limited — retry after ${rl.retryAfterSec}s`);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonError(500, 'missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  const results: { supabase?: string; upstash?: string } = {};
  let failed = false;

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    results.supabase = 'ok';
  } catch (err) {
    failed = true;
    results.supabase = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
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
