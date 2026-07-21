import { requireUser } from '@/lib/supabase/require-user';
import { LiveInterviewStartClient } from '@/components/live-interview-start-client';

interface CaseListRow {
  id: string;
  title: string;
  case_type: string;
  difficulty: string;
}

export default async function LiveInterviewStartPage() {
  const { supabase, user } = await requireUser();

  let cases: CaseListRow[] = [];
  try {
    const { data } = await supabase
      .from('cases')
      .select('id,title,case_type,difficulty')
      .eq('is_user_case', false)
      .order('created_at', { ascending: false })
      .limit(20);
    cases = (data as CaseListRow[]) ?? [];
  } catch (e) {
    console.warn('[live-interview] case list fetch failed (non-blocking):', e);
  }

  let resumeUpdatedAt: string | null = null;
  try {
    const { data } = await supabase
      .from('user_resumes')
      .select('updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    resumeUpdatedAt = data?.updated_at ?? null;
  } catch (e) {
    console.warn('[live-interview] resume status fetch failed (non-blocking):', e);
  }

  return <LiveInterviewStartClient cases={cases} resumeUpdatedAt={resumeUpdatedAt} />;
}
