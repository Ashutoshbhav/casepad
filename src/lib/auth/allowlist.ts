import type { SupabaseClient } from '@supabase/supabase-js';

// Public-launch flag: when ALLOWLIST_MODE=open, the gate is disabled and
// any verified email can sign in. This is what we run during the LinkedIn
// launch window. Default (unset) keeps the historical invite-only behaviour
// so existing dev environments don't silently flip semantics.
//
// To go back to invite-only: unset the env var (or set to 'closed') and
// redeploy. No data is lost — the email_allowlist table is still
// populated and the admin UI continues to manage it.
const OPEN_SIGNUP = process.env.ALLOWLIST_MODE === 'open';

export async function isEmailAllowed(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  if (OPEN_SIGNUP) return true;
  const { data, error } = await admin
    .from('email_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
