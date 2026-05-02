import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isEmailAllowed } from '@/lib/auth/allowlist';

// Handles both auth flows that hit this route:
//   1. PKCE / OAuth: ?code=...
//   2. Magic link / OTP: ?token_hash=...&type=email|magiclink|signup|recovery|invite
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const tokenHash = req.nextUrl.searchParams.get('token_hash');
  const type = req.nextUrl.searchParams.get('type') as EmailOtpType | null;
  const returnToRaw = req.nextUrl.searchParams.get('return_to');
  // Validate: must be a relative path; reject open redirects.
  const returnTo =
    returnToRaw && returnToRaw.startsWith('/') && !returnToRaw.startsWith('//')
      ? returnToRaw
      : '/cases';

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const supabase = await createSupabaseServerClient();

  let userEmail: string | undefined;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin?error=exchange', req.url));
    }
    userEmail = data.user.email;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin?error=otp', req.url));
    }
    userEmail = data.user.email;
  } else {
    return NextResponse.redirect(new URL('/auth/signin?error=missing-type', req.url));
  }

  const admin = createSupabaseAdminClient();
  const allowed = await isEmailAllowed(admin, userEmail);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/auth/no-access', req.url));
  }
  return NextResponse.redirect(new URL(returnTo, req.url));
}
