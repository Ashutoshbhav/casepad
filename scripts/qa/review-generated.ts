// scripts/qa/review-generated.ts
//
// Human review queue for Stage-2 generated cases (PRD v3.1). A generated case
// is NEVER served until approved here. Approving copies the row into the live
// `cases` table with provenance.generated = true; the seed corpus is untouched.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/review-generated.ts --list
//   npx tsx --env-file=.env.local scripts/qa/review-generated.ts --show <id>
//   npx tsx --env-file=.env.local scripts/qa/review-generated.ts --approve <id>
//   npx tsx --env-file=.env.local scripts/qa/review-generated.ts --reject <id>

import { createClient } from '@supabase/supabase-js';
import { approveGenerated, rejectGenerated } from '../../src/lib/generator/generate';

const args = process.argv.slice(2);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (n: string) => args.includes(`--${n}`);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SUPA_URL, KEY);
const REVIEWER = process.env.ADMIN_EMAIL || 'cli';

async function main() {
  if (has('list')) {
    const { data } = await supa
      .from('generated_case')
      .select('id, status, target_skill_id, title, factcheck, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    for (const g of data ?? []) {
      const fc = (g.factcheck as any)?.verdict ?? '?';
      const flags = ((g.factcheck as any)?.code_flags ?? []).length;
      console.log(
        `${g.status.padEnd(8)} ${g.id}  fc=${fc}${flags ? `(+${flags} flags)` : ''}  [${g.target_skill_id}]  ${g.title}`,
      );
    }
    return;
  }

  const showId = opt('show');
  if (showId) {
    const { data: g } = await supa.from('generated_case').select('*').eq('id', showId).single();
    if (!g) { console.error('not found'); process.exit(1); }
    console.log(`# ${g.title}   [${g.status}]`);
    console.log(`target skill: ${g.target_skill_id}   seed: ${g.seed_case_id}`);
    console.log(`\nPROBLEM STATEMENT:\n${g.problem_statement}`);
    console.log(`\nINTERVIEWER NOTES:`);
    for (const n of (g.interviewer_notes as any[]) ?? [])
      console.log(`  [${(n.trigger_keywords ?? []).join(', ')}] -> ${n.reveal_text}`);
    console.log(`\nIDEAL STRUCTURE:\n${JSON.stringify(g.ideal_structure, null, 2)}`);
    if ((g.exhibits as any[])?.length) console.log(`\nEXHIBITS:\n${JSON.stringify(g.exhibits, null, 2)}`);
    console.log(`\nGENERATION:\n${JSON.stringify(g.generation, null, 2)}`);
    console.log(`\nFACT-CHECK (verdict=${(g.factcheck as any)?.verdict}):`);
    for (const c of (g.factcheck as any)?.claims ?? [])
      console.log(`  [${c.grounded}] (${c.kind}) ${c.text}${c.note ? ` — ${c.note}` : ''}`);
    for (const f of (g.factcheck as any)?.code_flags ?? []) console.log(`  ⚠ ${f}`);
    return;
  }

  const approveId = opt('approve');
  if (approveId) {
    const { publishedCaseId } = await approveGenerated(supa, approveId, REVIEWER);
    console.log(`approved -> published as cases/${publishedCaseId}`);
    return;
  }

  const rejectId = opt('reject');
  if (rejectId) {
    await rejectGenerated(supa, rejectId, REVIEWER);
    console.log('rejected');
    return;
  }

  console.error('pass --list | --show <id> | --approve <id> | --reject <id>');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
