// Dump ALL cases in the DB (not a random sample) for full manual audit.
// Same format as sample-cases.mjs so apply-audit.mjs can reuse the parser.
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cases, error } = await supa
  .from('cases')
  .select('id,title,industry,case_type,difficulty,problem_statement,interviewer_notes,ideal_structure,casebook_id,provenance')
  .order('casebook_id', { ascending: true })
  .order('title', { ascending: true });

if (error) { console.error(error); process.exit(1); }

console.log(`Total cases in DB: ${cases.length}`);

const lines = [];
lines.push('# CasePad — FULL Case Audit\n');
lines.push(`All ${cases.length} cases. Mark each:\n`);
lines.push('- `[x]` good — keep as-is');
lines.push('- `[~]` usable but rough — keep, can polish later');
lines.push('- `[ ]` bad — DELETE');
lines.push('\nThen run `node --env-file=.env.local scripts/qa/apply-audit.mjs --apply` (script reads case-audit.md).\n');
lines.push('---\n');

for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
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
      lines.push(`- **trigger:** ${trig.slice(0, 200) || '_(none)_'}`);
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
      const subs = (b.subnodes || []).map((x) => typeof x === 'string' ? x : JSON.stringify(x));
      lines.push(`- **${b.node}** → ${subs.join(', ').slice(0, 200) || '_(no subnodes)_'}`);
    }
  }
  if (Array.isArray(s.key_insights) && s.key_insights.length) {
    lines.push(`**insights:** ${s.key_insights.slice(0, 3).join(' · ').slice(0, 300)}`);
  }
  lines.push('\n---\n');
}

const out = path.resolve('docs/qa/case-audit.md');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, lines.join('\n'));
console.log(`Wrote ${out}`);
process.exit(0);
