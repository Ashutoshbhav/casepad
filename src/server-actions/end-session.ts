'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { evaluateSession } from '@/lib/groq/evaluate-session';

export async function endSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const result = await evaluateSession(supabase, sessionId);
  if (!result.ok) {
    throw new Error(`evaluate failed (${result.status}): ${JSON.stringify(result.body)}`);
  }
  redirect(`/debrief/${sessionId}`);
}
