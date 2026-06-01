import { requireUser } from '@/lib/supabase/require-user';
import { DrillClient } from '@/components/drill-client';

export default async function DrillPage() {
  await requireUser();
  return <DrillClient />;
}
