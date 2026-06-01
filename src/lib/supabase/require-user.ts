// Shared "is the user signed in?" gate for Server Component pages.
//
// WHY THIS EXISTS:
// Nearly every page used to do this inline:
//
//   const supabase = await createSupabaseServerClient();
//   const { data: { session } } = await supabase.auth.getSession();  // <-- raw await
//   if (!session) redirect('/auth/signin');
//   const user = session.user;
//
// That raw `getSession()` await is the bug. A PostgREST/Auth *response* error
// returns `{ data, error }` (handled), but a true network blip makes the
// promise REJECT (throw). Nothing caught it, so the whole page render crashed
// and the user saw the full "Something didn't load" error screen — even though
// all that failed was a one-off session check.
//
// requireUser() centralises the gate and makes it never-fail: a thrown auth
// error is treated as "not signed in" → redirect to /auth/signin, exactly the
// same as a genuinely-absent session. One sturdy version, used everywhere.
//
// Returns the live supabase client too, so pages can reuse it for their own
// queries without creating a second one.

import { redirect } from 'next/navigation';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './server';

export interface RequiredUser {
  supabase: SupabaseClient;
  session: Session;
  user: User;
}

export async function requireUser(): Promise<RequiredUser> {
  const supabase = await createSupabaseServerClient();

  let session: Session | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (e) {
    // Transient auth-network failure — treat as signed-out, never crash.
    console.error('[requireUser] getSession failed (treating as no session):', e);
  }

  if (!session) redirect('/auth/signin');

  return { supabase, session, user: session.user };
}

/**
 * Like requireUser() but does NOT redirect — returns null session on failure
 * or when signed out. For pages (e.g. the public sign-in/landing page) that
 * must still render for signed-out visitors and must never crash on a blip.
 */
export async function getOptionalUser(): Promise<{
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();

  let session: Session | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (e) {
    console.error('[getOptionalUser] getSession failed (treating as no session):', e);
  }

  return { supabase, session, user: session?.user ?? null };
}
