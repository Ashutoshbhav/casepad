import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BehavioralDrillClient } from '@/components/behavioral-drill-client';

export default async function BehavioralDrillPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;
  return <BehavioralDrillClient />;
}
