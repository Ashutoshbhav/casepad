// scripts/qa/calibrate-tracer.ts
//
// Calibration harness for the skill knowledge-tracer (PRD v3.1 Stage 1).
// Compares the tracer's per-skill quality against a human gold set and reports
// Quadratic Weighted Kappa. Gate: show scores at overall QWK >= 0.6, drive
// assignment at >= 0.7.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/calibrate-tracer.ts \
//     --gold docs/calibration/gold-labels.json
//
//   # no gold yet? measure tracer self-consistency (a reliability ceiling):
//   npx tsx --env-file=.env.local scripts/qa/calibrate-tracer.ts \
//     --sessions <id1,id2,...> --stability
//
// gold-labels.json shape:
//   [
//     { "sessionId": "uuid",
//       "labels": { "mece_decomposition": 0.8, "sanity_checking": 0.2, ... } }
//   ]
// (quality in 0..1; only list skills the case actually exercised.)

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { buildTracingMessages, parseTracingResponse } from '../../src/lib/skills/knowledge-tracing';
import { completeChat } from '../../src/lib/llm-router';
import { calibrate, quadraticWeightedKappa, toBucket } from '../../src/lib/skills/qwk';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SUPA_URL, SERVICE_KEY);

interface Gold {
  sessionId: string;
  labels: Record<string, number>;
}

async function traceOnce(sessionId: string) {
  const { data: s, error } = await supa
    .from('sessions')
    .select('transcript, case_id')
    .eq('id', sessionId)
    .single();
  if (error || !s) throw new Error(`session ${sessionId}: ${error?.message ?? 'not found'}`);
  let caseTitle: string | null = null;
  let caseType: string | null = null;
  if (s.case_id) {
    const { data: c } = await supa
      .from('cases')
      .select('title, case_type')
      .eq('id', s.case_id)
      .maybeSingle();
    caseTitle = c?.title ?? null;
    caseType = c?.case_type ?? null;
  }
  const transcript = Array.isArray(s.transcript) ? (s.transcript as any[]) : [];
  const raw = await completeChat({
    tier: 'aux',
    messages: buildTracingMessages({ transcript, caseTitle, caseType }),
    max_tokens: 2000,
    temperature: 0,
    json: true,
  });
  const obs = parseTracingResponse(raw);
  const map: Record<string, number> = {};
  for (const o of obs) if (o.demonstrated) map[o.skillId] = o.quality;
  return map;
}

function fmt(x: number): string {
  return Number.isFinite(x) ? x.toFixed(3) : '  n/a';
}

async function main() {
  if (has('stability')) {
    const ids = (opt('sessions') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length < 2) {
      console.error('--stability needs --sessions with >= 2 ids');
      process.exit(1);
    }
    const a: number[] = [];
    const b: number[] = [];
    for (const id of ids) {
      const [m1, m2] = await Promise.all([traceOnce(id), traceOnce(id)]);
      for (const k of Object.keys(m1)) {
        if (k in m2) {
          a.push(toBucket(m1[k]));
          b.push(toBucket(m2[k]));
        }
      }
      console.log(`  ${id}: ${Object.keys(m1).length} skills`);
    }
    const qwk = quadraticWeightedKappa(a, b);
    console.log(`\nself-consistency QWK (tracer vs tracer, ${a.length} pairs): ${fmt(qwk)}`);
    console.log('(this is an UPPER BOUND on agreement with a human — if it is < 0.7 the prompt needs work before human labelling is worth it)');
    return;
  }

  const goldPath = opt('gold');
  if (!goldPath) {
    console.error('pass --gold <path> or --stability --sessions <ids>');
    process.exit(1);
  }
  const gold: Gold[] = JSON.parse(readFileSync(goldPath, 'utf8'));
  if (!Array.isArray(gold) || gold.length === 0) {
    console.error('gold file is empty');
    process.exit(1);
  }

  const rows: { skillId: string; tracer: number; gold: number }[] = [];
  const perSession: string[] = [];
  for (const g of gold) {
    const traced = await traceOnce(g.sessionId);
    let matched = 0;
    for (const [skillId, goldQ] of Object.entries(g.labels)) {
      if (skillId in traced) {
        rows.push({ skillId, tracer: traced[skillId], gold: goldQ });
        matched += 1;
      }
    }
    perSession.push(`  ${g.sessionId}: ${matched}/${Object.keys(g.labels).length} labelled skills also traced`);
  }

  console.log(perSession.join('\n'));
  const result = calibrate(rows);
  console.log(`\npairs: ${result.pairs}`);
  console.log(`overall QWK: ${fmt(result.overall)}`);
  console.log(`  show scores (>= 0.60):     ${result.showScores ? 'YES' : 'no'}`);
  console.log(`  drive assignment (>= 0.70): ${result.driveAssignment ? 'YES' : 'no'}`);
  console.log('\nper-skill QWK (>= 2 shared labels):');
  const entries = Object.entries(result.bySkill).sort((x, y) => (y[1] || -9) - (x[1] || -9));
  for (const [skillId, q] of entries) console.log(`  ${skillId.padEnd(28)} ${fmt(q)}`);

  console.log('\nCSV (skillId,tracer,gold):');
  for (const r of rows) console.log(`${r.skillId},${r.tracer},${r.gold}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
