import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TrackOnboardingClient } from '@/components/track-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function TrackOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <TrackOnboardingClient />;
}
