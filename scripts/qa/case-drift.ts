// scripts/qa/case-drift.ts
//
// Stage-4: show where a case's EMPIRICAL difficulty (case_calibration, updated
// after every session) has drifted from its corpus easy/medium/hard label.
// Review only — nothing here changes the label; that's a human content call.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/case-drift.ts [--min-plays 3]

import { createClient } from '@supabase/supabase-js';
import { bandFor, labelDrift } from '../../src/lib/calibration/case-elo';

const args = process.argv.slice(2);
const minPlays = Number((args.indexOf('--min-plays') >= 0 ? args[args.indexOf('--min-plays') + 1] : '3'));

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) { console.error('Missing Supabase env'); process.exit(1); }
const supa = createClient(SUPA_URL, KEY);

async function main() {
  const { data: cal } = await supa
    .from('case_calibration')
    .select('case_id, rating, plays')
    .gte('plays', minPlays);
  if (!cal || cal.length === 0) {
    console.log(`no cases with >= ${minPlays} plays yet.`);
    return;
  }
  const ids = cal.map((c) => c.case_id);
  const { data: cases } = await supa.from('cases').select('id, title, difficulty').in('id', ids);
  const byId = new Map((cases ?? []).map((c) => [c.id, c]));

  const rows = cal
    .map((c) => {
      const meta = byId.get(c.case_id);
      const label = (meta?.difficulty as string) ?? '?';
      return {
        title: meta?.title ?? c.case_id,
        label,
        elo: Math.round(c.rating),
        empiricalBand: bandFor(c.rating),
        drift: labelDrift(c.rating, label),
        plays: c.plays,
        disagrees: bandFor(c.rating) !== label,
      };
    })
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

  console.log(`case difficulty drift (>= ${minPlays} plays), most drifted first:\n`);
  console.log('drift  label   →  empirical   plays  title');
  for (const r of rows) {
    const flag = r.disagrees ? ' *' : '  ';
    const d = (r.drift >= 0 ? '+' : '') + r.drift;
    console.log(`${d.padStart(5)}${flag} ${r.label.padEnd(7)} → ${r.empiricalBand.padEnd(7)}  ${String(r.plays).padStart(4)}   ${r.title}`);
  }
  const dis = rows.filter((r) => r.disagrees);
  console.log(`\n${dis.length}/${rows.length} cases where the empirical band disagrees with the label.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
