import { requireUser } from '@/lib/supabase/require-user';
import { BehavioralDrillClient } from '@/components/behavioral-drill-client';

export default async function BehavioralDrillPage() {
  await requireUser();
  return <BehavioralDrillClient />;
}
