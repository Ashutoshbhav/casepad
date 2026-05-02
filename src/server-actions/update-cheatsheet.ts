'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS = ['framework', 'hypothesis', 'manual_notes'] as const;

export async function updateCheatSheetField(
  sessionId: string,
  field: 'framework' | 'hypothesis' | 'manual_notes',
  value: string,
  lock: boolean
) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    throw new Error('sessionId (string, ≤100 chars) required');
  }
  if (!ALLOWED_FIELDS.includes(field)) {
    throw new Error('field must be framework | hypothesis | manual_notes');
  }
  if (typeof value !== 'string') {
    throw new Error('value must be a string');
  }
  if (value.length > 2000) {
    throw new Error('value too large (>2000 chars)');
  }
  if (typeof lock !== 'boolean') {
    throw new Error('lock must be a boolean');
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not authenticated');

  // Confirm the cheat sheet's session belongs to the caller — otherwise any
  // signed-in user could overwrite anyone else's locked fields.
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) throw new Error('session not found');

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
