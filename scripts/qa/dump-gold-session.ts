// scripts/qa/dump-gold-session.ts
//
// Pull one or more sessions' full transcripts + their current gold labels so a
// human can spot-check the labelling. Review only — writes nothing.
//
//   npx tsx --env-file=.env.local scripts/qa/dump-gold-session.ts <sessionId> [<sessionId> ...]

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) { console.error('Missing Supabase env'); process.exit(1); }
const supa = createClient(SUPA_URL, KEY);

interface Gold { sessionId: string; _case?: string; labels: Record<string, number> }
const GOLD: Gold[] = JSON.parse(readFileSync('docs/calibration/gold-labels.json', 'utf8'));

async function dump(sessionId: string) {
  const { data: s } = await supa
    .from('sessions')
    .select('transcript, case_id, score, status')
    .eq('id', sessionId)
    .single();
  if (!s) { console.log(`\n### ${sessionId} — NOT FOUND\n`); return; }

  let caseTitle = '?', caseType = '?', problem = '';
  if (s.case_id) {
    const { data: c } = await supa
      .from('cases')
      .select('title, case_type, problem_statement')
      .eq('id', s.case_id)
      .maybeSingle();
    caseTitle = c?.title ?? '?';
    caseType = c?.case_type ?? '?';
    problem = c?.problem_statement ?? '';
  }

  const g = GOLD.find((x) => x.sessionId === sessionId);
  const tx = Array.isArray(s.transcript) ? (s.transcript as { role: string; content: string }[]) : [];
  const candTurns = tx.filter((t) => /cand|user/i.test(t.role)).length;

  console.log('\n' + '='.repeat(78));
  console.log(`SESSION  ${sessionId}`);
  console.log(`CASE     ${caseTitle}  (${caseType})`);
  console.log(`STATUS   ${s.status} · score ${s.score ?? 'null'} · ${tx.length} turns (${candTurns} candidate)`);
  console.log('='.repeat(78));
  if (problem) console.log(`\nPROMPT: ${problem.slice(0, 600)}${problem.length > 600 ? '…' : ''}\n`);

  console.log('--- TRANSCRIPT ---');
  tx.forEach((t, i) => {
    const who = /cand|user/i.test(t.role) ? 'CANDIDATE' : 'INTERVIEWER';
    console.log(`\n[${i}] ${who}:`);
    console.log(t.content.trim());
  });

  console.log('\n--- CURRENT GOLD LABELS ---');
  if (!g) {
    console.log('(none in gold-labels.json)');
  } else {
    for (const [k, v] of Object.entries(g.labels).sort((a, b) => a[1] - b[1])) {
      console.log(`  ${k.padEnd(28)} ${v}`);
    }
  }
  console.log('');
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.log('usage: dump-gold-session.ts <sessionId> [<sessionId> ...]');
    console.log('\navailable in gold set:');
    for (const g of GOLD) console.log(`  ${g.sessionId}  ${g._case ?? ''}`);
    return;
  }
  for (const id of ids) await dump(id);
}
main().catch((e) => { console.error(e); process.exit(1); });
