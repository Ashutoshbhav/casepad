// Foundation cleanup: deletes industry-stub fakes + in-casebook duplicates.
// Idempotent — pre-checks before delete. Run with --apply to commit.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

// Paginate around Supabase's 1000-row default cap.
let all = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await supa.from('cases')
    .select('id, title, problem_statement, casebook_id, created_at')
    .range(from, from + PAGE - 1);
  if (error) { console.error(error); process.exit(1); }
  all.push(...(data || []));
  if (!data || data.length < PAGE) break;
  from += PAGE;
}
console.log(`Loaded ${all.length} cases.`);

// 1. Industry-stub fakes: ps_len < 80 AND ps matches /analyze the.+industry/i
const stubIds = (all || [])
  .filter((c) => {
    const ps = (c.problem_statement || '').trim();
    return ps.length < 80 && /analyze the .+ industry/i.test(ps);
  })
  .map((c) => c.id);
console.log(`Stub-fakes to delete: ${stubIds.length}`);

// 2. In-casebook duplicates by (casebook_id, lowercased title) — keep longest problem_statement
const groups = new Map();
for (const c of all || []) {
  const key = `${c.casebook_id || ''}|${(c.title || '').trim().toLowerCase()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(c);
}
const dupDropIds = [];
for (const g of groups.values()) {
  if (g.length < 2) continue;
  const sorted = g.sort((a, b) => (b.problem_statement || '').length - (a.problem_statement || '').length);
  for (const r of sorted.slice(1)) dupDropIds.push(r.id);
}
console.log(`In-casebook dup-drops: ${dupDropIds.length}`);

const toDelete = [...new Set([...stubIds, ...dupDropIds])];
console.log(`Total unique deletions: ${toDelete.length}`);

if (!apply) {
  console.log('[dry-run] re-run with --apply to commit.');
  process.exit(0);
}

const { error } = await supa.from('cases').delete().in('id', toDelete);
if (error) {
  console.error('Delete failed:', error.message);
  process.exit(1);
}
console.log(`Deleted ${toDelete.length} rows.`);
