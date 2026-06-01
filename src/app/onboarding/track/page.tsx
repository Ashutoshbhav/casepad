import { requireUser } from '@/lib/supabase/require-user';
import { TrackOnboardingClient } from '@/components/track-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function TrackOnboardingPage() {
  await requireUser();
  return <TrackOnboardingClient />;
}
