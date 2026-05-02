// Backfill case_type (where 'other') and tracks[] (where default ['consulting'])
// Pass 1: re-classify case_type for rows where case_type='other'
// Pass 2: assign tracks[] for ALL cases — overwriting default ['consulting']
//
// Run: node --env-file=.env.local scripts/qa/backfill-tracks-and-types.mjs
// Dry run: append --dry-run
//
// Concurrency: 5 in parallel; rate-limit-aware retry on 429.
// Resumable: skips rows that already have non-default values.

import { createClient } from '@supabase/supabase-js';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = process.argv.includes('--only-types') ? 'types' :
             process.argv.includes('--only-tracks') ? 'tracks' : 'both';
const FORCE_NVIDIA = process.argv.includes('--provider=nvidia');

if (!SUPA_URL || !SUPA_KEY) { console.error('Missing Supabase env'); process.exit(1); }
if (!GROQ_KEY && !NVIDIA_KEY) { console.error('Missing GROQ_API_KEY and NVIDIA_API_KEY (need at least one)'); process.exit(1); }

const supa = createClient(SUPA_URL, SUPA_KEY);
const PROVIDERS = [
  ...(FORCE_NVIDIA ? [] : (GROQ_KEY ? [{ name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' }] : [])),
  ...(NVIDIA_KEY ? [{ name: 'nvidia', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: NVIDIA_KEY, model: 'meta/llama-3.3-70b-instruct' }] : []),
];
console.log(`LLM providers (in order): ${PROVIDERS.map(p => p.name).join(' → ')}`);
const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || 2);

const ALLOWED_TYPES = ['profitability','market_entry','operations','pricing','mna','estimation','gtm','other'];
const ALLOWED_TRACKS = ['consulting','ib_pe_vc','pm','marketing','strategy_bizops','behavioral'];

// ---------- LLM router (Groq → NVIDIA fallback) ----------
async function callProvider(provider, messages) {
  const r = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 200,
      stream: false,
    }),
  });
  if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
    const body = await r.text();
    const err = new Error(`${provider.name} HTTP ${r.status}: ${body.slice(0, 200)}`);
    err.shouldFailover = true;
    throw err;
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${provider.name} HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(content); } catch { return null; }
}

async function groqJSON(messages) {
  let lastErr;
  for (const p of PROVIDERS) {
    // Per-provider retry: up to 4 attempts with exponential backoff on 429.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await callProvider(p, messages);
      } catch (err) {
        lastErr = err;
        if (err.shouldFailover && /HTTP 429/.test(err.message)) {
          // Rate-limited — back off then retry same provider.
          const backoff = Math.min(60_000, 3_000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 2000);
          await sleep(backoff);
          continue;
        }
        if (err.shouldFailover) {
          // 5xx — failover immediately.
          break;
        }
        // Network/parse error — retry same provider once.
        if (attempt < 1) {
          await sleep(1500 + Math.random() * 1000);
          continue;
        }
        break;
      }
    }
    // Out of retries on this provider — try next.
  }
  throw lastErr || new Error('all providers failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Heartbeat / stall detection ----------
const HEARTBEAT_PATH = 'logs/backfill-heartbeat.log';
const STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min with no successful row update => exit
let lastSuccessTs = Date.now();

function ensureHeartbeatDir() {
  const dir = dirname(HEARTBEAT_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
ensureHeartbeatDir();

function writeHeartbeat(pass, done, total) {
  try {
    appendFileSync(HEARTBEAT_PATH, `${new Date().toISOString()} ${pass} ${done}/${total}\n`);
  } catch (e) {
    console.warn(`  [hb] write failed: ${e.message}`);
  }
}

function markSuccess() {
  lastSuccessTs = Date.now();
}

function checkStall(pass) {
  const idleMs = Date.now() - lastSuccessTs;
  if (idleMs > STALL_TIMEOUT_MS) {
    const idleSec = Math.round(idleMs / 1000);
    const line = `${new Date().toISOString()} STALL ${pass} idle=${idleSec}s`;
    try { appendFileSync(HEARTBEAT_PATH, line + '\n'); } catch {}
    console.error(`STALLED — no progress for 5 min (idle ${idleSec}s on pass=${pass})`);
    process.exit(2);
  }
}

// ---------- Classifiers ----------
function buildTypePrompt(title, problem) {
  const sys = `You classify a business case into ONE case_type. Allowed values:
- profitability: declining/improving profit, cost vs revenue, margin issues
- market_entry: entering a new market/geography/segment
- operations: process/supply chain/operational efficiency
- pricing: setting/changing prices
- mna: M&A, acquisitions, divestitures, JVs
- estimation: market sizing / guesstimate / "how many"
- gtm: go-to-market, product launch, channel, distribution
- other: only if genuinely none of the above fit

Return JSON: {"case_type": "<value>"}. Pick exactly one. Bias toward a specific type over 'other' when reasonable.`;
  const user = `TITLE: ${title || '(none)'}\nPROBLEM:\n${(problem || '').slice(0, 600)}\n\nReturn JSON only.`;
  return [{ role: 'system', content: sys }, { role: 'user', content: user }];
}

function buildTracksPrompt(title, problem) {
  const sys = `You decide which student tracks a business case is RELEVANT to. Allowed track values:
- consulting: classic strategy/management consulting cases (profitability, market entry, M&A, ops)
- ib_pe_vc: investment banking / private equity / venture capital — valuation, deals, financial structuring, investment thesis
- pm: product management — feature prioritization, product strategy, user/UX, metrics, A/B tests, launches
- marketing: brand, positioning, advertising, segmentation/targeting, channel marketing, growth
- strategy_bizops: corporate strategy / business operations — internal strategy, ops scaling, org design
- behavioral: behavioral / fit / personal stories (NOT business problem cases)

Return JSON: {"tracks": ["<v1>", "<v2>", ...]} with 1-3 values. A profitability case is consulting + strategy_bizops. A product launch is consulting + pm + marketing. A valuation/deal case is ib_pe_vc (+ consulting if strategic). Most business cases include "consulting".`;
  const user = `TITLE: ${title || '(none)'}\nPROBLEM:\n${(problem || '').slice(0, 600)}\n\nReturn JSON only with 1-3 tracks.`;
  return [{ role: 'system', content: sys }, { role: 'user', content: user }];
}

async function classifyType(c) {
  const out = await groqJSON(buildTypePrompt(c.title, c.problem_statement));
  let v = (out?.case_type || '').toLowerCase().trim();
  if (!ALLOWED_TYPES.includes(v)) v = 'other';
  return v;
}

async function classifyTracks(c) {
  const out = await groqJSON(buildTracksPrompt(c.title, c.problem_statement));
  let arr = Array.isArray(out?.tracks) ? out.tracks : [];
  arr = arr.map((t) => String(t).toLowerCase().trim()).filter((t) => ALLOWED_TRACKS.includes(t));
  arr = Array.from(new Set(arr));
  if (arr.length === 0) arr = ['consulting'];
  if (arr.length > 3) arr = arr.slice(0, 3);
  return arr;
}

// ---------- Concurrency runner ----------
async function runPool(items, worker, label) {
  let done = 0;
  let errors = 0;
  const total = items.length;
  const queue = items.slice();
  const startedAt = Date.now();

  // Reset the stall clock at the start of each pass — pre-pass DB scans may
  // take >5 min and shouldn't trip the watchdog before any worker runs.
  lastSuccessTs = Date.now();

  async function next() {
    while (queue.length) {
      const item = queue.shift();
      try {
        const result = await worker(item);
        // Worker returns truthy on a successful DB update; falsy means
        // skipped/no-op. Only successful writes bump the watchdog.
        if (result) markSuccess();
      } catch (e) {
        errors++;
        console.error(`  [err] ${item.id?.slice(0,8)} "${(item.title||'').slice(0,40)}" — ${e.message?.slice(0,200)}`);
      } finally {
        done++;
        // After every batch of 50, log progress, write heartbeat, and check
        // for stall. If 5 min passed with no successful row update, bail.
        if (done % 50 === 0 || done === total) {
          const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
          console.log(`  [${label}] ${done}/${total} (${(done/total*100).toFixed(0)}%) — ${secs}s elapsed, ${errors} errors`);
          writeHeartbeat(label, done, total);
          checkStall(label);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => next()));
  return { done, errors };
}

// ---------- Verification ----------
async function fetchAllCases(columns) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.from('cases').select(columns).range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

async function snapshot(label) {
  const rows = await fetchAllCases('case_type,tracks');

  const typeCounts = {};
  const trackCounts = {};
  for (const r of rows) {
    const t = r.case_type || 'null';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    const tracks = Array.isArray(r.tracks) ? r.tracks : [];
    for (const tr of tracks) trackCounts[tr] = (trackCounts[tr] || 0) + 1;
  }
  console.log(`\n[${label}] case_type counts (total ${rows.length}):`);
  for (const [k, v] of Object.entries(typeCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${String(v).padStart(5)} ${k}`);
  }
  console.log(`[${label}] track counts (case appears in each of its tracks):`);
  for (const [k, v] of Object.entries(trackCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${String(v).padStart(5)} ${k}`);
  }
  return { typeCounts, trackCounts, total: rows.length };
}

// ---------- Main ----------
async function main() {
  const t0 = Date.now();
  console.log(`Backfill starting (dry-run=${DRY_RUN}, only=${ONLY})\n`);

  const before = await snapshot('BEFORE');

  // ---- Pass 1: case_type='other' ----
  if (ONLY === 'both' || ONLY === 'types') {
    console.log(`\n== Pass 1: re-classify case_type='other' ==`);
    let rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supa
        .from('cases')
        .select('id,title,problem_statement,case_type')
        .eq('case_type', 'other')
        .range(from, from + 999);
      if (error) { console.error(error); process.exit(1); }
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    console.log(`Found ${rows.length} rows with case_type='other'`);

    await runPool(rows, async (c) => {
      const newType = await classifyType(c);
      if (newType === 'other') return false; // genuinely unclassifiable — no-op
      if (DRY_RUN) return true; // count as progress so watchdog stays quiet
      const { error: uerr } = await supa.from('cases').update({ case_type: newType }).eq('id', c.id);
      if (uerr) throw new Error(uerr.message);
      return true;
    }, 'types');
  }

  // ---- Pass 2: tracks for all cases still defaulted to ['consulting'] ----
  if (ONLY === 'both' || ONLY === 'tracks') {
    console.log(`\n== Pass 2: assign tracks[] for rows still at default ['consulting'] ==`);
    const rows = await fetchAllCases('id,title,problem_statement,tracks');

    // Resumable: skip rows whose tracks is anything other than literal ['consulting'].
    const todo = rows.filter((r) => {
      const tr = Array.isArray(r.tracks) ? r.tracks : [];
      return tr.length === 1 && tr[0] === 'consulting';
    });
    console.log(`Found ${todo.length} rows still at default tracks=['consulting'] (of ${rows.length} total)`);

    await runPool(todo, async (c) => {
      const newTracks = await classifyTracks(c);
      // Skip writing if result is still exactly ['consulting'] — avoids no-op churn but
      // also makes the row look "unprocessed" to a future re-run. To make it truly
      // resumable in that edge case, we still write so future invocations skip it.
      if (DRY_RUN) return true;
      const { error: uerr } = await supa.from('cases').update({ tracks: newTracks }).eq('id', c.id);
      if (uerr) throw new Error(uerr.message);
      return true;
    }, 'tracks');
  }

  const after = await snapshot('AFTER');

  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDONE in ${wallSec}s (dry-run=${DRY_RUN})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
