import type { SupabaseClient } from '@supabase/supabase-js';

export async function isEmailAllowed(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('email_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
