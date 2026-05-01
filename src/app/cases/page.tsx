import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CaseCard } from '@/components/case-card';
import { CaseFilters } from '@/components/case-filters';

export default async function CasesPage({
  searchParams,
}: { searchParams: Promise<{ industry?: string; type?: string; difficulty?: string; q?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  // Only select fields CaseCard actually displays — full JSONB columns
  // (interviewer_notes, ideal_structure) bloat the payload to MB at 120 rows.
  let query = supabase
    .from('cases')
    .select('id,title,industry,case_type,difficulty,source')
    .order('created_at', { ascending: false })
    .limit(60);
  if (sp.industry) query = query.eq('industry', sp.industry);
  if (sp.type) query = query.eq('case_type', sp.type);
  if (sp.difficulty) query = query.eq('difficulty', sp.difficulty);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);

  const { data: cases } = await query;
  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <a href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">Dashboard →</a>
      </header>
      <CaseFilters />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(cases ?? []).map((c) => <CaseCard key={c.id} c={c as any} />)}
      </div>
      {(cases ?? []).length === 0 && (
        <div className="text-zinc-500 text-sm mt-12">No cases match these filters.</div>
      )}
    </main>
  );
}
