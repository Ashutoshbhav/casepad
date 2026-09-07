// scripts/qa/generate-cases.ts
//
// Stage-2 generator CLI (PRD v3.1). Builds full grounded cases that stress a
// target micro-skill, fact-checks each, and stages it in `generated_case`
// (status 'draft'). Nothing is served until approved via review-generated.ts.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/generate-cases.ts \
//     --seed <caseId> --skill <skill_id> [--n 1]
//
//   # pick a seed automatically by case type:
//   npx tsx --env-file=.env.local scripts/qa/generate-cases.ts \
//     --skill sanity_checking --seed-type profitability [--n 3]

import { createClient } from '@supabase/supabase-js';
import { generateAndStage } from '../../src/lib/generator/generate';
import { isSkillId } from '../../src/lib/skills/taxonomy';

const args = process.argv.slice(2);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SUPA_URL, KEY);

async function pickSeed(seedType?: string): Promise<string> {
  let q = supa.from('cases').select('id, title').not('problem_statement', 'is', null).limit(50);
  if (seedType) q = q.eq('case_type', seedType);
  const { data } = await q;
  if (!data || data.length === 0) throw new Error('no seed case found');
  const pick = data[Math.floor(Math.random() * data.length)];
  console.log(`seed: ${pick.title} (${pick.id})`);
  return pick.id;
}

async function main() {
  const skill = opt('skill');
  if (!skill || !isSkillId(skill)) {
    console.error(`--skill required and must be a valid skill id (got: ${skill ?? 'none'})`);
    process.exit(1);
  }
  const n = Math.max(1, Math.min(10, Number(opt('n') ?? '1')));
  let seedId = opt('seed');
  if (!seedId) seedId = await pickSeed(opt('seed-type'));

  for (let i = 0; i < n; i++) {
    try {
      const r = await generateAndStage(supa, { seedCaseId: seedId, targetSkillId: skill });
      console.log(
        `[${i + 1}/${n}] ${r.id}  "${r.draftTitle}"  factcheck=${r.verdict}` +
          (r.ungroundedCount ? `  ungrounded=${r.ungroundedCount}` : '') +
          (r.codeFlags.length ? `  codeFlags=${r.codeFlags.length}` : ''),
      );
      if (r.codeFlags.length) r.codeFlags.forEach((f) => console.log(`      ⚠ ${f}`));
    } catch (e) {
      console.error(`[${i + 1}/${n}] FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log('\nreview: npx tsx --env-file=.env.local scripts/qa/review-generated.ts --list');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
