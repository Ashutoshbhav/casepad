// One-shot: search cases for "netflix" in title, problem_statement, or industry.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const term = 'netflix';

const { data, error } = await supa
  .from('cases')
  .select('id,title,industry,case_type,difficulty,source,problem_statement')
  .or(`title.ilike.%${term}%,problem_statement.ilike.%${term}%`);

if (error) {
  console.error('ERR', error);
  process.exit(1);
}

console.log(`Matches: ${data.length}`);
for (const c of data) {
  console.log('---');
  console.log(`id:     ${c.id}`);
  console.log(`title:  ${c.title}`);
  console.log(`type:   ${c.case_type} · ${c.difficulty}`);
  console.log(`indus:  ${c.industry}`);
  console.log(`source: ${c.source}`);
  console.log(`prompt: ${(c.problem_statement || '').slice(0, 220)}${(c.problem_statement || '').length > 220 ? '…' : ''}`);
}
