import { requireUser } from '@/lib/supabase/require-user';
import { MathDrillClient } from '@/components/math-drill-client';

export default async function MathDrillPage() {
  await requireUser();
  return <MathDrillClient />;
}
