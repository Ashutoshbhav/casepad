// scripts/qa/optimize-tracer-prompt.ts
//
// Stage-4 self-improvement flywheel (PRD v3.1) — GEPA-style prompt optimisation
// for the knowledge-tracer. arXiv:2507.19457: reflective mutation + Pareto
// selection, no fine-tuning.
//
//   1. score the CURRENT tracer prompt against the gold set (QWK)
//   2. show an LLM the worst per-skill rows and ask for a targeted rewrite of
//      those skills' "observable" text + optional extra rules  (N proposals)
//   3. re-score each proposal against the gold set
//   4. keep the Pareto frontier (QWK vs. prompt size)
//   5. write a PROPOSAL file for a human to review + apply by hand
//
// It NEVER edits src/lib/skills/knowledge-tracing.ts. "Never auto-deploy
// prompts" — a person promotes a proposal.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/optimize-tracer-prompt.ts \
//     --gold docs/calibration/gold-labels.json [--n 5]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  buildTracingMessages,
  parseTracingResponse,
} from '../../src/lib/skills/knowledge-tracing';
import { completeChat } from '../../src/lib/llm-router';
import { calibrate } from '../../src/lib/skills/qwk';
import { SKILLS } from '../../src/lib/skills/taxonomy';

const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) { console.error('Missing Supabase env'); process.exit(1); }
const supa = createClient(SUPA_URL, KEY);

type Override = { observableOverrides?: Record<string, string>; extraRules?: string };
interface Gold { sessionId: string; labels: Record<string, number> }

const GOLD: Gold[] = JSON.parse(readFileSync(opt('gold') ?? 'docs/calibration/gold-labels.json', 'utf8'));
const N = Math.max(1, Math.min(8, Number(opt('n') ?? '4')));

const DUMMY_TX = [{ role: 'candidate', content: 'x' }];
function promptSize(o: Override): number {
  return buildTracingMessages({ transcript: DUMMY_TX, opts: o }).reduce((n, m) => n + m.content.length, 0);
}

async function traceSession(sessionId: string, o: Override): Promise<Record<string, number>> {
  const { data: s } = await supa.from('sessions').select('transcript, case_id').eq('id', sessionId).single();
  let caseTitle: string | null = null, caseType: string | null = null;
  if (s?.case_id) {
    const { data: c } = await supa.from('cases').select('title, case_type').eq('id', s.case_id).maybeSingle();
    caseTitle = c?.title ?? null; caseType = c?.case_type ?? null;
  }
  const transcript = Array.isArray(s?.transcript) ? (s!.transcript as any[]) : [];
  const raw = await completeChat({
    tier: 'aux', temperature: 0, json: true, max_tokens: 2000,
    messages: buildTracingMessages({ transcript, caseTitle, caseType, opts: o }),
  });
  const map: Record<string, number> = {};
  for (const ob of parseTracingResponse(raw)) if (ob.demonstrated) map[ob.skillId] = ob.quality;
  return map;
}

async function scoreAgainstGold(o: Override) {
  const rows: { skillId: string; tracer: number; gold: number }[] = [];
  for (const g of GOLD) {
    const traced = await traceSession(g.sessionId, o);
    for (const [sid, gq] of Object.entries(g.labels)) if (sid in traced) rows.push({ skillId: sid, tracer: traced[sid], gold: gq });
  }
  return { result: calibrate(rows), rows };
}

function worstSkills(bySkill: Record<string, number>, k = 4): string[] {
  return Object.entries(bySkill)
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .slice(0, k)
    .map(([s]) => s);
}

async function proposeMutation(baselineQwk: number, bySkill: Record<string, number>, csv: string): Promise<Override | null> {
  const worst = worstSkills(bySkill);
  const catalog = SKILLS.filter((s) => worst.includes(s.id)).map((s) => `- ${s.id}: ${s.observable}`).join('\n');
  const raw = await completeChat({
    tier: 'primary', temperature: 0.7, json: true, max_tokens: 1200,
    messages: [
      { role: 'system', content: `You improve a rubric used by an LLM to score consulting-case micro-skills. Overall agreement with human graders is QWK ${baselineQwk.toFixed(3)}. These skills disagree most with humans:\n${catalog}\n\nBelow is (tracer, human) score data for the worst skills. Propose a TARGETED rewrite: sharpen the "observable" wording for these skills so the LLM grades more like the human, and optionally one extra scoring rule. Keep it tight — do not bloat.\n\nOutput strict JSON: {"observableOverrides": {"skill_id": "new observable sentence", ...}, "extraRules": "- one extra rule, or empty string"}` },
      { role: 'user', content: `tracer,human rows for the worst skills:\n${csv}\n\nReturn the JSON.` },
    ],
  });
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]) as Override;
    const clean: Override = {};
    if (o.observableOverrides && typeof o.observableOverrides === 'object') {
      clean.observableOverrides = {};
      for (const [k, v] of Object.entries(o.observableOverrides)) {
        if (SKILLS.some((s) => s.id === k) && typeof v === 'string' && v.length > 10) clean.observableOverrides[k] = v.slice(0, 400);
      }
    }
    if (typeof o.extraRules === 'string' && o.extraRules.trim().length > 5) clean.extraRules = o.extraRules.trim().slice(0, 300);
    return Object.keys(clean.observableOverrides ?? {}).length || clean.extraRules ? clean : null;
  } catch { return null; }
}

function csvOf(rows: { skillId: string; tracer: number; gold: number }[], only: string[]): string {
  return rows.filter((r) => only.includes(r.skillId)).map((r) => `${r.skillId},${r.tracer},${r.gold}`).join('\n');
}

async function main() {
  console.log(`gold: ${GOLD.length} sessions · proposals: ${N}\n`);
  console.log('scoring baseline…');
  const base = await scoreAgainstGold({});
  console.log(`baseline QWK ${base.result.overall.toFixed(3)}  (size ${promptSize({})})`);
  const worst = worstSkills(base.result.bySkill);
  const csv = csvOf(base.rows, worst);

  const candidates: { o: Override; qwk: number; size: number }[] = [
    { o: {}, qwk: base.result.overall, size: promptSize({}) },
  ];
  for (let i = 0; i < N; i++) {
    process.stdout.write(`proposal ${i + 1}/${N}: `);
    const o = await proposeMutation(base.result.overall, base.result.bySkill, csv);
    if (!o) { console.log('(model returned nothing usable)'); continue; }
    const s = await scoreAgainstGold(o);
    const size = promptSize(o);
    candidates.push({ o, qwk: s.result.overall, size });
    console.log(`QWK ${s.result.overall.toFixed(3)}  (Δ ${(s.result.overall - base.result.overall >= 0 ? '+' : '')}${(s.result.overall - base.result.overall).toFixed(3)}, size ${size})`);
  }

  // Pareto frontier: maximise QWK, minimise size.
  const pareto = candidates.filter((c) =>
    !candidates.some((d) => d !== c && d.qwk >= c.qwk && d.size <= c.size && (d.qwk > c.qwk || d.size < c.size)));
  const best = [...candidates].sort((a, b) => b.qwk - a.qwk)[0];

  mkdirSync('docs/calibration/proposals', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `docs/calibration/proposals/tracer-prompt-${ts}.md`;
  const lines: string[] = [
    `# Tracer-prompt optimisation proposal — ${new Date().toISOString()}`,
    ``,
    `GEPA-style. Gold set: ${GOLD.length} sessions. Baseline QWK **${base.result.overall.toFixed(3)}**.`,
    `Worst skills: ${worst.join(', ')}.`,
    ``,
    `## Candidates`,
    ``,
    `| # | overall QWK | Δ | prompt size | on Pareto frontier |`,
    `|---|---|---|---|---|`,
    ...candidates.map((c, i) => `| ${i === 0 ? 'baseline' : i} | ${c.qwk.toFixed(3)} | ${i === 0 ? '—' : (c.qwk - base.result.overall >= 0 ? '+' : '') + (c.qwk - base.result.overall).toFixed(3)} | ${c.size} | ${pareto.includes(c) ? 'yes' : ''} |`),
    ``,
    `## Recommended`,
    ``,
    best === candidates[0]
      ? `No proposal beat the baseline. Keep the current prompt; grow the gold set and re-run.`
      : `Candidate with QWK **${best.qwk.toFixed(3)}** (Δ ${(best.qwk - base.result.overall >= 0 ? '+' : '') + (best.qwk - base.result.overall).toFixed(3)}). Apply to \`src/lib/skills/knowledge-tracing.ts\` BY HAND after eyeballing the wording, then re-run \`calibrate-tracer.ts\`.`,
    ``,
    '```json',
    JSON.stringify(best.o, null, 2),
    '```',
    ``,
    `> Not applied automatically. A person promotes this.`,
  ];
  writeFileSync(path, lines.join('\n') + '\n');
  console.log(`\nwrote ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
