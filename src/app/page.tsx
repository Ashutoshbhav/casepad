import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  // Use getSession() instead of getUser() to avoid an extra Supabase Auth
  // round-trip — proxy.ts already validated the JWT before this page rendered.
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect('/cases');
  redirect('/auth/signin');
}
