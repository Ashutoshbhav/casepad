// Cross-casebook dedup: same case content appearing under different casebook_ids.
// The (casebook_id, title) unique key catches same-book dupes but misses cases
// that appear in IIMA + IIMB + ISB casebooks separately.
//
// Strategy: hash first 200 chars of problem_statement (lowercased, whitespace
// normalized). Group by hash. For each group with >1 row, keep the EARLIEST
// inserted; delete the rest. Logs decisions before applying.
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

function fingerprint(text) {
  const norm = (text || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

const { data: cases, error } = await supa
  .from('cases')
  .select('id, title, problem_statement, created_at, casebook_id')
  .order('created_at', { ascending: true });
if (error) { console.error(error); process.exit(1); }

console.log(`Scanning ${cases.length} cases for cross-casebook duplicates...`);

const groups = new Map();
for (const c of cases) {
  if (!c.problem_statement || c.problem_statement.length < 50) continue;
  const fp = fingerprint(c.problem_statement);
  if (!groups.has(fp)) groups.set(fp, []);
  groups.get(fp).push(c);
}

const dupGroups = [...groups.values()].filter((g) => g.length > 1);
console.log(`${dupGroups.length} duplicate groups (${dupGroups.reduce((a, g) => a + g.length - 1, 0)} duplicates)`);

const toDelete = [];
for (const g of dupGroups) {
  const [keep, ...drop] = g; // earliest-inserted kept
  console.log(`  KEEP: ${keep.id.slice(0, 8)} "${keep.title.slice(0, 50)}"`);
  for (const d of drop) {
    console.log(`  DROP: ${d.id.slice(0, 8)} "${d.title.slice(0, 50)}"  (different casebook)`);
    toDelete.push(d.id);
  }
}

if (toDelete.length === 0) {
  console.log('No cross-casebook duplicates found.');
  process.exit(0);
}

if (!apply) {
  console.log(`\n[dry-run] Would delete ${toDelete.length} duplicate rows. Re-run with --apply.`);
  process.exit(0);
}

// Batch delete
const batchSize = 100;
let totalDeleted = 0;
for (let i = 0; i < toDelete.length; i += batchSize) {
  const batch = toDelete.slice(i, i + batchSize);
  const { count, error: dErr } = await supa.from('cases').delete({ count: 'exact' }).in('id', batch);
  if (dErr) { console.error('batch fail:', dErr.message); break; }
  totalDeleted += count || 0;
}
console.log(`\nDeleted ${totalDeleted} duplicate rows.`);
