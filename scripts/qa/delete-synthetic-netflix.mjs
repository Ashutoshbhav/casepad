import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const id = '06cca06a-51f4-4bbe-81ca-a82bd85c65d4';

// Pre-check: make sure no sessions reference it (FK to cases is ON DELETE CASCADE
// per migration 0001, so it'd take sessions with it — guard against that).
const { data: sessions, error: e1 } = await supa
  .from('sessions')
  .select('id,user_id,status')
  .eq('case_id', id);

if (e1) { console.error('session-check err', e1); process.exit(1); }
if (sessions && sessions.length > 0) {
  // Verified safe: only allow cascade through if every session has zero messages.
  for (const s of sessions) {
    const { data: msgs } = await supa.from('messages').select('id').eq('session_id', s.id).limit(1);
    if (msgs && msgs.length > 0) {
      console.error(`ABORTING — session ${s.id} has messages. Won't cascade-delete real work.`);
      process.exit(1);
    }
  }
  console.log(`Cascading ${sessions.length} empty session(s).`);
}

const { error } = await supa.from('cases').delete().eq('id', id);
if (error) { console.error('delete err', error); process.exit(1); }

console.log(`Deleted synthetic case ${id}`);
