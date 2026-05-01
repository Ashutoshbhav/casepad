// Read the marked-up case-audit.md, parse the checkbox state per case, and
// apply: `[x]` and `[~]` are kept, `[ ]` (still empty after audit) is deleted.
// Dry-run by default unless --apply is passed.
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import path from 'path';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const apply = process.argv.includes('--apply');
const file = path.resolve('docs/qa/case-audit.md');
const text = await readFile(file, 'utf8');

// Each case starts with: "## N. `[X]` Title" where X is x, ~, or space.
// We capture the marker AND the id from the line right after.
// Tolerate CRLF (Windows) line endings.
const re = /^## \d+\. `\[(.)]` .+\r?\n\*\*id:\*\* `([0-9a-f-]{36})`/gm;
const items = [];
let m;
while ((m = re.exec(text)) !== null) {
  items.push({ marker: m[1], id: m[2] });
}

const counts = { good: 0, usable: 0, bad: 0 };
const toDelete = [];
for (const it of items) {
  if (it.marker === 'x' || it.marker === 'X') counts.good++;
  else if (it.marker === '~') counts.usable++;
  else { counts.bad++; toDelete.push(it.id); }
}

console.log(`Audit summary: ${items.length} cases parsed`);
console.log(`  good [x]:    ${counts.good}`);
console.log(`  usable [~]:  ${counts.usable}`);
console.log(`  delete [ ]:  ${counts.bad}`);

const usableRatio = (counts.good + counts.usable) / items.length;
console.log(`  usable ratio: ${(usableRatio * 100).toFixed(0)}%`);
console.log();

if (toDelete.length === 0) {
  console.log('No cases marked for deletion.');
  process.exit(0);
}

if (!apply) {
  console.log(`[dry-run] Would delete ${toDelete.length} cases. Re-run with --apply to actually delete.`);
  console.log('First 5 ids to delete:', toDelete.slice(0, 5));
  process.exit(0);
}

// Apply deletion
const { error, count } = await supa.from('cases').delete({ count: 'exact' }).in('id', toDelete);
if (error) {
  console.error('Deletion failed:', error.message);
  process.exit(1);
}
console.log(`Deleted ${count} cases.`);
