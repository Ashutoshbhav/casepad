import { requireUser } from '@/lib/supabase/require-user';
import { LiveInterviewStartClient } from '@/components/live-interview-start-client';

interface CaseListRow {
  id: string;
  title: string;
  case_type: string;
  difficulty: string;
}

// Catalog-wide picker, same filter contract as /cases (src/app/cases/page.tsx)
// — industry/type/difficulty/q — reusing the identical query shape rather
// than inventing a second filtering approach. Previously hardcoded to the
// 20 most-recently-added cases with no way to search/filter, which meant
// the ~1,145 other cases in the catalog were effectively unreachable from
// the voice-first entry point even though the engine already supports any
// case id (startLiveCaseInterview takes an arbitrary caseId).
export default async function LiveInterviewStartPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string; type?: string; difficulty?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();

  let cases: CaseListRow[] = [];
  try {
    let query = supabase
      .from('cases')
      .select('id,title,case_type,difficulty')
      .eq('is_user_case', false)
      .order('created_at', { ascending: false })
      .limit(40);
    if (sp.industry) query = query.eq('industry', sp.industry);
    if (sp.type) query = query.eq('case_type', sp.type);
    if (sp.difficulty) query = query.eq('difficulty', sp.difficulty);
    if (sp.q) query = query.ilike('title', `%${sp.q}%`);
    const { data } = await query;
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

  const hasFilters = Boolean(sp.industry || sp.type || sp.difficulty || sp.q);

  return <LiveInterviewStartClient cases={cases} resumeUpdatedAt={resumeUpdatedAt} hasFilters={hasFilters} />;
}
