import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DrillClient } from '@/components/drill-client';

export const dynamic = 'force-dynamic';

export default async function DrillPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <DrillClient />;
}
