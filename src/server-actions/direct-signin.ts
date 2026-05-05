'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isEmailAllowed } from '@/lib/auth/allowlist';
import { checkRateLimit } from '@/lib/rate-limit';

// Direct sign-in for allowlisted cohort members.
//
// Trade-off (chosen explicitly): we skip the magic-link inbox round-trip.
// Anyone who knows an allowlisted email can sign in as that person.
// Acceptable for a private 5-30 cohort with low-stakes content.
//
// How it works under the hood:
//   1. Validate email shape + check allowlist.
//   2. Use the service-role admin client to generate a magiclink — this
//      returns a token_hash + ensures the user row exists in auth.users
//      (creates it if first sign-in).
//   3. The browser-cookie SSR client immediately verifies that token_hash,
//      which mints a real Supabase session and sets the auth cookies.
//   4. Redirect priority:
//      - return_to (deep-link recovery from AuthWatchdog) wins if safe
//      - else /onboarding/track if no track yet
//      - else /dashboard (the journey home — not /cases the library)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function directSignIn(formData: FormData) {
  const rawEmail = (formData.get('email') ?? '').toString().trim().toLowerCase();
  if (!rawEmail) redirect('/auth/signin?error=missing-email');
  if (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
    redirect('/auth/signin?error=invalid-email');
  }

  // Rate-limit per IP — 8 attempts per minute. Discourages brute-forcing
  // through the allowlist via guessed emails.
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  const rl = checkRateLimit(`signin:${ip}`, 8, 60_000);
  if (!rl.ok) {
    redirect('/auth/signin?error=rate-limited');
  }

  // Per-email rate limit too — 4 attempts per minute. Stops focused
  // attacks on a single email.
  const rlEmail = checkRateLimit(`signin:email:${rawEmail}`, 4, 60_000);
  if (!rlEmail.ok) {
    redirect('/auth/signin?error=rate-limited');
  }

  const admin = createSupabaseAdminClient();

  // 1. Allowlist check first — bounce strangers cleanly.
  const allowed = await isEmailAllowed(admin, rawEmail);
  if (!allowed) redirect('/auth/no-access');

  // 2. Mint a magic-link token via the admin API. This also creates the
  //    auth.users row on first sign-in (shouldCreateUser = default true).
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: rawEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    redirect('/auth/signin?error=link-mint-failed');
  }

  // 3. Verify the token via the SSR-cookied client so cookies get set on
  //    the response. This is the part that produces a real signed-in session.
  const supabase = await createSupabaseServerClient();
  const { data: verify, error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: link!.properties!.hashed_token,
    type: 'magiclink',
  });
  if (verifyErr || !verify?.user) {
    redirect('/auth/signin?error=verify-failed');
  }

  const userId = verify!.user!.id;

  // 4. Enforce max-2-devices-per-user. The newly-minted session was just
  //    inserted into auth.sessions. Query the table, sort by created_at
  //    DESC, keep top 2, delete the rest. The booted devices' refresh
  //    tokens cascade-delete with the session row, so on their next nav
  //    /api/* call returns 401 → AuthWatchdog intercepts → redirects them
  //    to /auth/signin with a "session expired" toast.
  //
  //    Service role is required to read/delete the auth schema. We do this
  //    after sign-in (not before) so the new device always wins; even if
  //    you already had 2 sessions, the new one stays.
  try {
    const { data: deletedCount, error: pruneErr } = await admin.rpc('prune_user_sessions', {
      p_user_id: userId,
      p_keep: 2,
    });
    if (pruneErr) throw pruneErr;
    if ((deletedCount ?? 0) > 0) {
      console.log(`[direct-signin] booted ${deletedCount} oldest sessions for ${rawEmail}`);
    }
  } catch (err) {
    // Non-fatal — sign-in still succeeds. Worst case: user has 3+ sessions.
    console.warn('[direct-signin] device-cap prune failed:', (err as Error).message);
  }

  // 5. Pick redirect target.
  //    a) return_to (deep-link recovery from AuthWatchdog) takes priority,
  //       but only if it's a safe relative path. This preserves the original
  //       UX where someone bumped from a deep link lands back on it post-auth.
  //    b) New users without a track → /onboarding/track.
  //    c) Default home is now /dashboard (the journey frame), not /cases.
  const rawReturnTo = (formData.get('return_to') ?? '').toString();
  const safeReturnTo =
    rawReturnTo &&
    rawReturnTo.startsWith('/') &&
    !rawReturnTo.startsWith('//') &&
    !rawReturnTo.startsWith('/auth')
      ? rawReturnTo
      : null;
  const hasTrack = !!verify!.user!.user_metadata?.preferred_track;
  if (safeReturnTo) redirect(safeReturnTo);
  redirect(hasTrack ? '/dashboard' : '/onboarding/track');
}
