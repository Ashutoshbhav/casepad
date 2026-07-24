// src/app/api/admin/smoke-check/route.ts
//
// Server-side twin of scripts/smoke/production-check.ts — same check (mint a
// real signed-in session, send a real /api/chat turn, assert the reply
// isn't one of the known static-fallback probes), but runnable by a
// scheduled CLOUD agent that has no access to local secrets.
//
// Why this exists rather than just giving the cron job the CLI script: that
// script needs SUPABASE_SERVICE_ROLE_KEY directly (full RLS-bypass DB
// access). A cloud routine's prompt is STORED CONFIG, not a local secret
// store — embedding that key there would mean a full-access production
// credential sitting in a system built for task prompts. This route runs
// server-side, where the real secrets already live via Vercel's own env and
// never have to leave the server. The routine instead holds exactly one
// new, single-purpose, low-blast-radius token (SMOKE_CHECK_TOKEN) — if that
// leaks, the worst case is someone can trigger a throwaway smoke session,
// nothing close to service-role access.
//
// 2026-07-24: created after the second silent LLM-fallback-chain outage in
// a month (see docs/SESSION-STATE.md) — both were caught by a human running
// the CLI script by hand, which is exactly the failure mode this exists to
// close.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Mirrors src/lib/groq/static-fallbacks.ts FALLBACK_PROBES — duplicated on
// purpose (see production-check.ts's identical note): this check must keep
// working even if the app's own module graph is what's broken.
const FALLBACK_PROBES = [
  "Walk me through how you'd structure this case.",
  'Lay out your structure for me.',
  'Talk me through your framework.',
  "What's your hypothesis so far — and why?",
  'What do you think is actually broken here?',
  "Give me your gut — where's the issue?",
  "Where would you start digging — and what number would tell you you're right?",
  'Pick one branch. Why that one first?',
  "What's the first piece of data you want, and what would change your mind?",
  'Pause — if you had to give the CEO your answer in 30 seconds, what would it be?',
  "Time to wrap. What's your bottom line?",
  'Synthesise. What would you tell the client?',
  "What's the one number that would change your recommendation?",
  'Defend your answer in one sentence.',
  'If you had to bet on this — yes or no, and why?',
];

function stripWatermark(text: string): string {
  return text.replace(/[​‌]/g, '');
}

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

  // Defense in depth — this token is meant to be called a handful of times
  // an hour by a scheduled routine, not hammered. Caps the damage of a leak
  // even before anyone notices and rotates the token.
  const rl = checkRateLimit('smoke-check', 12, 60 * 60 * 1000);
  if (!rl.ok) return jsonError(429, `rate limited — retry after ${rl.retryAfterSec}s`);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!SUPABASE_URL || !SERVICE_KEY || !ADMIN_EMAIL) {
    return jsonError(500, 'missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_EMAIL');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casepad.vercel.app';
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let sessionId: string | null = null;

  try {
    // 1. Find a real case to test against (InvestCo if present, else any usable case).
    let caseRow = (
      await admin.from('cases').select('id, title').eq('title', 'InvestCo').maybeSingle()
    ).data;
    if (!caseRow) {
      caseRow = (
        await admin
          .from('cases')
          .select('id, title')
          .not('problem_statement', 'is', null)
          .limit(1)
          .maybeSingle()
      ).data;
    }
    if (!caseRow) return jsonError(502, 'no usable case found in the cases table');

    // 2. Resolve the admin test user's id.
    const { data: userList, error: userErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (userErr) return jsonError(502, `listUsers failed: ${userErr.message}`);
    const testUser = userList.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!testUser) return jsonError(502, `ADMIN_EMAIL ${ADMIN_EMAIL} not found in auth.users`);

    // 3. Mint a magic-link token and exchange it against /auth/callback for a
    //    real, valid auth cookie — same live sign-in path a candidate uses.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: ADMIN_EMAIL,
    });
    if (linkErr) return jsonError(502, `generateLink failed: ${linkErr.message}`);
    const tokenHash = linkData.properties.hashed_token;

    const cookies = new Map<string, string>();
    let nextUrl: string | null = `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=magiclink`;
    for (let redirects = 0; redirects < 5 && nextUrl; redirects++) {
      const res: Response = await fetch(nextUrl, {
        redirect: 'manual',
        headers: { Cookie: [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ') },
      });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      const loc: string | null = res.headers.get('location');
      if (!loc) break;
      nextUrl = loc.startsWith('http') ? loc : `${siteUrl}${loc}`;
    }
    if (cookies.size === 0) return jsonError(502, 'no auth cookies captured from /auth/callback — sign-in itself is broken');
    const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

    // 4. Seed a session directly (service role, bypasses RLS).
    const seedTranscript = [
      { role: 'interviewer', content: 'Smoke-test opener.', timestamp: new Date().toISOString() },
    ];
    const { data: session, error: sessErr } = await admin
      .from('sessions')
      .insert({ user_id: testUser.id, case_id: caseRow.id, transcript: seedTranscript, track: 'consulting' })
      .select('id')
      .single();
    if (sessErr || !session) return jsonError(502, `session seed insert failed: ${sessErr?.message}`);
    sessionId = session.id as string;

    // 5. Send a real turn through /api/chat on this SAME live deployment.
    const chatRes = await fetch(`${siteUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        sessionId,
        userTurn: 'Smoke test — please respond as you normally would to a candidate opening the case.',
      }),
    });

    if (chatRes.status !== 200) {
      return jsonError(502, `/api/chat returned HTTP ${chatRes.status}: ${(await chatRes.text()).slice(0, 200)}`);
    }

    const raw = await chatRes.text();
    const clean = stripWatermark(raw).trim();

    if (clean.length < 10) {
      return jsonError(502, `/api/chat returned an empty/near-empty response ("${clean}")`);
    }
    if (FALLBACK_PROBES.includes(clean)) {
      return jsonError(
        502,
        `/api/chat returned the STATIC FORTRESS FALLBACK ("${clean}") — all LLM providers are unreachable or misconfigured.`
      );
    }

    return NextResponse.json({ ok: true, message: `live interviewer response: "${clean.slice(0, 160)}"` });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : String(err));
  } finally {
    if (sessionId) {
      await admin.from('sessions').delete().eq('id', sessionId).then(
        () => {},
        () => {}
      );
    }
  }
}
