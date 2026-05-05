import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE url or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// feedback rows
const { data: fb, error: fbErr } = await supabase
  .from('session_feedback')
  .select('id, session_id, user_id, sentiment, free_text, created_at')
  .order('created_at', { ascending: false });

// completed session count for context (table name guess: practice_sessions)
let sessionCount = null;
const candidates = ['practice_sessions', 'sessions', 'case_sessions'];
for (const t of candidates) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (!error) { sessionCount = { table: t, count }; break; }
}

console.log(JSON.stringify({
  feedback: { count: fb?.length ?? 0, rows: fb, error: fbErr },
  sessionContext: sessionCount,
}, null, 2));
