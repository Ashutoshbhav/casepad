#!/usr/bin/env bash
# After Phase 4 (current second-pass) finishes, re-run second-pass to pick up
# the new ash2-* casebooks Ash dropped, and tag PM-specific ones with tracks=['pm'].
cd "$(dirname "$0")/../.."
exec >> logs/all-phases.log 2>&1
echo
echo "=== Waiting for Phase 4 to finish ==="
until grep -q "ALL PHASES COMPLETE\|Phase 4 had failures" logs/all-phases.log 2>/dev/null; do sleep 30; done
echo
echo "=== Phase 5: re-run second pass for new ash2-* casebooks ==="
INGEST_CONCURRENCY=4 npm run ingest:second-pass || echo "(phase 5 had failures)"
echo
echo "=== Phase 6: tag PM casebooks with pm track ==="
node --env-file=.env.local -e "
const {createClient}=require('@supabase/supabase-js');
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const {data: pmBooks} = await s.from('casebooks').select('id,title').or('title.ilike.%PM%,title.ilike.%product_management%,title.ilike.%pocketbook%');
  console.log('PM-tagged casebooks:', (pmBooks||[]).map(b=>b.title));
  for (const b of (pmBooks||[])) {
    await s.from('cases').update({tracks: ['consulting','pm']}).eq('casebook_id', b.id);
  }
})();" || echo "(phase 6 had failures)"
echo
echo "=== ALL EXTENDED PHASES COMPLETE at \$(date) ==="
