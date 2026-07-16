// scripts/smoke/production-check.ts
//
// Catches the class of bug the 2026-07-16 incident was: every LLM/DB secret
// on Vercel Production silently blanked out, Fortress's fail-open logic
// degraded every turn to static filler instead of crashing, and nobody
// noticed for over a month because nothing was watching for "is this always
// the fallback." This script starts a real case and sends a real turn
// against a live deployment, then asserts the response is NOT one of the
// known static-fallback probes (see src/lib/groq/static-fallbacks.ts).
//
// Fortress is supposed to degrade gracefully on transient failure — this
// check is the thing that should have been screaming for the last month.
// It doesn't replace Fortress; it watches the thing Fortress can't see about
// itself (sustained, not transient, failure).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/smoke/production-check.ts
//   PROD_URL=https://casepad-preview-xyz.vercel.app npx tsx --env-file=.env.local scripts/smoke/production-check.ts
//
// Exit code 0 = healthy, 1 = degraded/broken. Wire this into a scheduled
// cron (see the `schedule` skill) so it actually gets watched instead of
// living as a one-off manual check.

import { createClient } from '@supabase/supabase-js';

const PROD_URL = process.env.PROD_URL || 'https://casepad.vercel.app';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

// Mirrors src/lib/groq/static-fallbacks.ts FALLBACK_PROBES. Duplicated
// (rather than imported) on purpose — this script must keep working even if
// the app's module graph is broken, and it must not accidentally import any
// server-only code.
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

// Strip the invisible steganographic watermark (ZWSP U+200B / ZWNJ U+200C)
// before comparing — see src/lib/security/watermark.ts.
function stripWatermark(text: string): string {
  return text.replace(/[​‌]/g, '');
}

function fail(message: string): never {
  console.error(`[smoke] FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !ADMIN_EMAIL) {
    fail('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_EMAIL in env');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log(`[smoke] target: ${PROD_URL}`);

  // 1. Find a real case to test against (InvestCo if present, else any usable case).
  let { data: caseRow } = await admin
    .from('cases')
    .select('id, title')
    .eq('title', 'InvestCo')
    .maybeSingle();
  if (!caseRow) {
    const { data } = await admin
      .from('cases')
      .select('id, title')
      .not('problem_statement', 'is', null)
      .limit(1)
      .maybeSingle();
    caseRow = data;
  }
  if (!caseRow) fail('no usable case found in the cases table');
  console.log(`[smoke] using case: ${caseRow!.title} (${caseRow!.id})`);

  // 2. Resolve the admin test user's id (for the session insert).
  const { data: userList, error: userErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (userErr) fail(`listUsers failed: ${userErr.message}`);
  const testUser = userList.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (!testUser) fail(`ADMIN_EMAIL ${ADMIN_EMAIL} not found in auth.users`);

  // 3. Mint a magic-link token and exchange it against the LIVE deployment's
  //    /auth/callback so we get a real, valid auth cookie for that deployment.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (linkErr) fail(`generateLink failed: ${linkErr.message}`);
  const tokenHash = linkData.properties.hashed_token;

  const cookies = new Map<string, string>();
  let nextUrl = `${PROD_URL}/auth/callback?token_hash=${tokenHash}&type=magiclink`;
  for (let redirects = 0; redirects < 5 && nextUrl; redirects++) {
    const res = await fetch(nextUrl, {
      redirect: 'manual',
      headers: { Cookie: [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ') },
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const loc = res.headers.get('location');
    if (!loc) break;
    nextUrl = loc.startsWith('http') ? loc : `${PROD_URL}${loc}`;
  }
  if (cookies.size === 0) fail('no auth cookies captured from /auth/callback — sign-in itself is broken');
  const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  // 4. Seed a session directly (service role, bypasses RLS) so we don't
  //    depend on the startSession Server Action's internal wiring — this
  //    script tests the CHAT turn path specifically.
  const seedTranscript = [
    { role: 'interviewer', content: 'Smoke-test opener.', timestamp: new Date().toISOString() },
  ];
  const { data: session, error: sessErr } = await admin
    .from('sessions')
    .insert({ user_id: testUser.id, case_id: caseRow!.id, transcript: seedTranscript, track: 'consulting' })
    .select('id')
    .single();
  if (sessErr || !session) fail(`session seed insert failed: ${sessErr?.message}`);
  const sessionId = session.id as string;

  try {
    // 5. Send a real turn through /api/chat on the live deployment.
    const chatRes = await fetch(`${PROD_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        sessionId,
        userTurn: 'Smoke test — please respond as you normally would to a candidate opening the case.',
      }),
    });

    if (chatRes.status !== 200) {
      fail(`/api/chat returned HTTP ${chatRes.status}: ${(await chatRes.text()).slice(0, 200)}`);
    }

    const raw = await chatRes.text();
    const clean = stripWatermark(raw).trim();

    if (clean.length < 10) {
      fail(`/api/chat returned an empty/near-empty response ("${clean}")`);
    }
    if (FALLBACK_PROBES.includes(clean)) {
      fail(
        `/api/chat returned the STATIC FORTRESS FALLBACK ("${clean}") — this means all LLM providers ` +
          `are unreachable or misconfigured on production (check GROQ_API_KEY / NVIDIA_API_KEY).`
      );
    }

    console.log(`[smoke] PASS — live interviewer response: "${clean.slice(0, 120)}${clean.length > 120 ? '…' : ''}"`);
  } finally {
    // 6. Clean up the seeded session regardless of outcome.
    await admin.from('sessions').delete().eq('id', sessionId);
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
