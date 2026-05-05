import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  // Use getSession() instead of getUser() to avoid an extra Supabase Auth
  // round-trip — proxy.ts already validated the JWT before this page rendered.
  const { data: { session } } = await supabase.auth.getSession();
  // /dashboard is the journey home for signed-in users; /cases is now the
  // explore-the-library escape hatch reached from the dashboard.
  if (session) redirect('/dashboard');
  redirect('/auth/signin');
}
