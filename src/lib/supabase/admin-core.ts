import { createClient } from '@supabase/supabase-js';

// Plain factory with no `server-only` guard — safe for use from tsx scripts
// (ingest, audits, maintenance). Inside the Next.js app, import from
// `./admin` instead so the build fails fast if a client component touches it.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
