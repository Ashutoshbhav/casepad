import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const caseId = '06cca06a-51f4-4bbe-81ca-a82bd85c65d4';

const { data: sessions, error } = await supa
  .from('sessions')
  .select('id,user_id,status,started_at,ended_at')
  .eq('case_id', caseId);

if (error) { console.error(error); process.exit(1); }

console.log(`${sessions.length} session(s) on case ${caseId}:\n`);
for (const s of sessions) {
  console.log(`session ${s.id}`);
  console.log(`  user:    ${s.user_id}`);
  console.log(`  status:  ${s.status}`);
  console.log(`  started: ${s.started_at}`);
  console.log(`  ended:   ${s.ended_at ?? '—'}`);

  // Count messages
  const { data: msgs } = await supa
    .from('messages')
    .select('id', { count: 'exact', head: false })
    .eq('session_id', s.id);
  console.log(`  msgs:    ${msgs?.length ?? 0}`);
}
