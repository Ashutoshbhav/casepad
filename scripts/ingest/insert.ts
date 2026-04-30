import { createSupabaseAdminClient } from '../../src/lib/supabase/admin';

type CaseInsert = {
  title: string;
  industry: string;
  case_type: string;
  difficulty: string;
  source: string | null;
  casebook_id: string | null;
  problem_statement: string;
  interviewer_notes: any[];
  ideal_structure: any;
  tags: string[];
  provenance: Record<string, unknown>;
};

export async function upsertCasebook(school: string, year: number | null, title: string, sourceUrl: string, localPath: string) {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from('casebooks')
    .select('id')
    .eq('school', school)
    .eq('title', title)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await admin
    .from('casebooks')
    .insert({ school, year, title, source_url: sourceUrl, local_path: localPath })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function insertCase(row: CaseInsert): Promise<{ inserted: boolean; reason?: string }> {
  const admin = createSupabaseAdminClient();

  // Idempotency: skip if same (casebook_id, title) exists
  if (row.casebook_id) {
    const { data: dup } = await admin
      .from('cases')
      .select('id')
      .eq('casebook_id', row.casebook_id)
      .eq('title', row.title)
      .maybeSingle();
    if (dup) return { inserted: false, reason: 'duplicate' };
  }

  const { error } = await admin.from('cases').insert(row);
  if (error) return { inserted: false, reason: error.message };
  return { inserted: true };
}

export async function bumpCasebookCount(casebookId: string, by: number) {
  const admin = createSupabaseAdminClient();
  const { data: cb } = await admin.from('casebooks').select('case_count').eq('id', casebookId).single();
  await admin.from('casebooks').update({ case_count: (cb?.case_count ?? 0) + by }).eq('id', casebookId);
}
