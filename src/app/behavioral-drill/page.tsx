import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BehavioralDrillClient } from '@/components/behavioral-drill-client';

export const dynamic = 'force-dynamic';

export default async function BehavioralDrillPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <BehavioralDrillClient />;
}
