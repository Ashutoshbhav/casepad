// Re-insert "Netflix avg view duration drop" — ash-authored custom practice case.
// Tagged honestly (source: ash-custom-prompt, tags include 'custom') so it's
// never confused with real-corpus cases. Original synthetic version (id
// 06cca06a…) was deleted earlier; this is the explicit re-insert per Ash's
// direct request on 2026-05-20.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const row = {
  title: 'Netflix: Average View Duration Drop',
  industry: 'tech',
  case_type: 'profitability', // metric-drop diagnosis archetype
  difficulty: 'medium',
  source: 'ash-custom-prompt', // honest source — NOT 'manual'
  problem_statement:
    'The average view duration on Netflix has dropped. The team needs to diagnose the root cause of the decline and recommend interventions to recover engagement.',
  tracks: ['consulting', 'pm'],
  tags: ['custom', 'ash-authored'],
  provenance: {
    added_by: 'ash',
    via: 'casepad cli',
    authored_by: 'ash',
    is_custom: true,
    not_from_real_casebook: true,
    requested_at: '2026-05-20',
    reason: 'user-requested practice case — explicit override of real-cases-only default after rejecting Chickflix as real-analog',
  },
};

const { data: existing } = await supa
  .from('cases')
  .select('id,title')
  .eq('title', row.title);

if (existing && existing.length > 0) {
  console.log(`Already exists: ${existing[0].id}`);
  process.exit(0);
}

const { data, error } = await supa
  .from('cases')
  .insert(row)
  .select('id,title,industry,case_type,difficulty,source,problem_statement,tracks,tags')
  .single();

if (error) { console.error('insert err', error); process.exit(1); }

console.log('INSERTED');
console.log(`id:     ${data.id}`);
console.log(`title:  ${data.title}`);
console.log(`type:   ${data.case_type} · ${data.difficulty}`);
console.log(`source: ${data.source}`);
console.log(`tags:   ${data.tags?.join(', ')}`);
console.log(`tracks: ${data.tracks?.join(', ')}`);
console.log(`\nSolve at: https://casepad.vercel.app/solve/${data.id}`);
