'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateCheatSheetField(
  sessionId: string,
  field: 'framework' | 'hypothesis' | 'manual_notes',
  value: string,
  lock: boolean
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('cheat_sheets')
    .select('locked_fields')
    .eq('session_id', sessionId)
    .single();
  const lockedFields = new Set(existing?.locked_fields ?? []);
  if (lock) lockedFields.add(field); else lockedFields.delete(field);

  await supabase
    .from('cheat_sheets')
    .update({
      [field]: value,
      locked_fields: Array.from(lockedFields),
      last_updated: new Date().toISOString(),
    })
    .eq('session_id', sessionId);
  revalidatePath(`/solve/[caseId]`, 'page');
}
