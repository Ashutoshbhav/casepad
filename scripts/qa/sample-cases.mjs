// Pull N random cases from Supabase and write a readable markdown audit file
// with a checkbox grid Ash can mark up. Sister script `apply-audit.mjs` reads
// the marked-up file and deletes anything tagged ❌.
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const N = Number(process.argv[2]) || 30;

// Stratify across casebooks so we don't sample the same book repeatedly.
const { data: cases, error } = await supa
  .from('cases')
  .select('id,title,industry,case_type,difficulty,problem_statement,interviewer_notes,ideal_structure,casebook_id,provenance')
  .order('id', { ascending: false }); // random would need rpc, this is good enough for stratification

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Total cases in DB: ${cases.length}`);

// Pseudo-random sample of N
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sample = shuffle(cases).slice(0, N);

const lines = [];
lines.push('# CasePad — Case Quality Audit\n');
lines.push(`Sampled ${sample.length} of ${cases.length} cases. Read each, mark with one of:\n`);
lines.push('- `[x]` good — keep as-is');
lines.push('- `[~]` usable but rough — keep, can polish later');
lines.push('- `[ ]` bad — DELETE');
lines.push('\nSave the file when done, then run `node scripts/qa/apply-audit.mjs`.\n');
lines.push('---\n');

for (let i = 0; i < sample.length; i++) {
  const c = sample[i];
  const book = c.provenance?.casebook_title?.replace(/^manual__/, '').replace(/_20/g, ' ').replace(/\.pdf$/, '') || 'unknown';
  lines.push(`## ${i + 1}. \`[ ]\` ${c.title}`);
  lines.push(`**id:** \`${c.id}\` · **book:** ${book} · **industry:** ${c.industry} · **type:** ${c.case_type} · **difficulty:** ${c.difficulty}\n`);
  lines.push('### Problem statement');
  lines.push((c.problem_statement || '_(empty)_').slice(0, 1500));
  lines.push('');
  lines.push('### Interviewer notes (reveal-on-question)');
  if (Array.isArray(c.interviewer_notes) && c.interviewer_notes.length) {
    for (const n of c.interviewer_notes.slice(0, 5)) {
      const trig = (n.trigger_keywords || []).join(', ');
      const rev = (n.reveal_text || '').slice(0, 300);
      lines.push(`- **trigger:** ${trig || '_(none)_'}`);
      lines.push(`  **reveal:** ${rev}`);
    }
    if (c.interviewer_notes.length > 5) lines.push(`- _(+${c.interviewer_notes.length - 5} more)_`);
  } else {
    lines.push('_(none)_');
  }
  lines.push('');
  lines.push('### Ideal structure');
  const s = c.ideal_structure || {};
  lines.push(`framework: ${s.framework ?? '_(none)_'}`);
  if (Array.isArray(s.branches) && s.branches.length) {
    for (const b of s.branches.slice(0, 6)) {
      lines.push(`- **${b.node}** → ${(b.subnodes || []).join(', ') || '_(no subnodes)_'}`);
    }
  }
  if (Array.isArray(s.key_insights) && s.key_insights.length) {
    lines.push(`**insights:** ${s.key_insights.slice(0, 3).join(' · ')}`);
  }
  lines.push('\n---\n');
}

const out = path.resolve('docs/qa/case-audit.md');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, lines.join('\n'));
console.log(`Wrote ${out}`);
console.log(`Open it in VS Code. Mark each [ ] with [x] / [~] / leave [ ] for delete.`);
