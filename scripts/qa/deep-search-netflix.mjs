// Deep search: look across title + problem_statement + interviewer_notes + ideal_structure
// for any case that's actually about Netflix engagement / view-duration / watch time.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// 1. Cast jsonb to text and search across all fields for the relevant terms.
// Supabase rpc not available, so do it client-side: fetch a reasonable chunk and filter locally.
const { data, error } = await supa
  .from('cases')
  .select('id,title,case_type,difficulty,source,problem_statement,interviewer_notes,ideal_structure')
  .limit(5000);

if (error) { console.error(error); process.exit(1); }

console.log(`Scanned ${data.length} cases`);

const terms = [
  /view.?duration/i,
  /watch.?time/i,
  /watch.?duration/i,
  /minutes.?(watched|viewed)/i,
  /engagement.?(drop|decline|down)/i,
  /retention.?(drop|decline)/i,
  /average.?session.?length/i,
  /time.?spent.?(per|on)/i,
];

const hits = [];
for (const c of data) {
  const blob = JSON.stringify({
    t: c.title,
    p: c.problem_statement,
    n: c.interviewer_notes,
    s: c.ideal_structure,
  });
  const matched = terms.filter((re) => re.test(blob));
  if (matched.length > 0) {
    hits.push({ c, matched: matched.map((r) => r.source) });
  }
}

console.log(`\n=== Engagement / view-duration / watch-time matches: ${hits.length} ===\n`);
for (const { c, matched } of hits) {
  console.log('---');
  console.log(`id:     ${c.id}`);
  console.log(`title:  ${c.title}`);
  console.log(`type:   ${c.case_type} · ${c.difficulty}`);
  console.log(`source: ${c.source}`);
  console.log(`match:  [${matched.join(', ')}]`);
  console.log(`prompt: ${(c.problem_statement || '').slice(0, 240)}`);
}

// 2. Also list any case with "netflix" in any field
console.log(`\n=== Any field containing "netflix" ===\n`);
const netflixHits = data.filter((c) =>
  /netflix/i.test(JSON.stringify({ t: c.title, p: c.problem_statement, n: c.interviewer_notes, s: c.ideal_structure }))
);
console.log(`Total: ${netflixHits.length}`);
for (const c of netflixHits) {
  console.log('---');
  console.log(`id:     ${c.id}`);
  console.log(`title:  ${c.title}`);
  console.log(`source: ${c.source}`);
}
