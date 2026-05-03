import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TopNav } from './top-nav';

// Server wrapper around the client TopNav. Reads the session locally
// (no Supabase Auth round-trip — just cookie inspection) and decides
// whether to mount the bar at all (signed-out users see only the
// /auth/signin page; we hide the nav there via TopNav's path check).

export async function TopNavMount() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const email = session.user.email ?? null;
  const isAdmin = email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
  return <TopNav email={email} isAdmin={!!isAdmin} />;
}
