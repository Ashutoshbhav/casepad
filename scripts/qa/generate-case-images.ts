// scripts/qa/generate-case-images.ts
//
// Generates one editorial-style image per case via Pollinations.ai Flux
// (free, unlimited, no API key required as of May 2026 — see
// https://github.com/pollinations/pollinations).
//
// Output: public/case-photos/cases/{case_id}.jpg — referenced by
// src/lib/case-images/picker.ts. The picker uses these as the primary
// image and falls back to the bundled 147 photos via onError when a
// specific case hasn't been generated yet.
//
// Idempotent: skips a case if its file already exists. Re-runnable safely.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/generate-case-images.ts \
//     [--limit=10] [--starter] [--force] [--ids=id1,id2,...] [--throttle-ms=1200]
//
// Throttle default = 1200ms between requests (~50 req/min) to stay polite to
// Pollinations even though they advertise "unlimited". 1,165 cases × 1.2s
// = ~24 min wall time end-to-end.

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { STARTER_CASE_IDS } from '../../src/lib/starter-cases';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'case-photos', 'cases');

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 560; // matches the 4:2.8 aspect ratio of the case-row placard

// Per-case_type stylistic hint appended to the prompt. Keeps the visual
// language coherent within a case type without dictating the subject
// (the title + industry already do that). Conservative wording — Flux
// can drift if you over-specify "no text" etc.
const CASE_TYPE_VISUAL: Record<string, string> = {
  profitability: 'financial analytics setting, charts and ledgers softly visible',
  market_entry: 'global business expansion mood, strategic planning atmosphere',
  operations: 'industrial operations setting, factory floor or supply chain',
  estimation: 'abstract calculation theme, blueprints and numbers',
  pricing: 'retail and product pricing context, shelves with tagged items',
  mna: 'corporate negotiation atmosphere, contracts and boardrooms',
  gtm: 'product launch and growth marketing setting',
  other: 'modern business setting',
};

interface CaseRow {
  id: string;
  title: string | null;
  industry: string | null;
  case_type: string | null;
  problem_statement: string | null;
}

function parseArgs(argv: string[]) {
  const opts = {
    limit: undefined as number | undefined,
    starter: false,
    force: false,
    ids: [] as string[],
    throttleMs: 1200,
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--limit=')) opts.limit = parseInt(a.slice(8), 10);
    else if (a === '--starter') opts.starter = true;
    else if (a === '--force') opts.force = true;
    else if (a.startsWith('--ids=')) opts.ids = a.slice(6).split(',').filter(Boolean);
    else if (a.startsWith('--throttle-ms=')) opts.throttleMs = parseInt(a.slice(14), 10);
  }
  return opts;
}

/**
 * Build a Flux prompt from a case row. Heavy on the title (most case-
 * specific signal) + industry. Suppresses people-faces / text since
 * Flux often hallucinates both badly. Keeps it editorial / photographic
 * to avoid the uncanny-illustration look.
 */
function promptFor(c: CaseRow): string {
  const titleClean = (c.title || 'business case').replace(/[^\w\s\-&'.]/g, '');
  const industry = (c.industry || 'business').toLowerCase();
  const caseType = (c.case_type || 'other').toLowerCase();
  const stylistic = CASE_TYPE_VISUAL[caseType] || CASE_TYPE_VISUAL.other;
  return [
    `${titleClean}`,
    `${industry} industry`,
    stylistic,
    'editorial professional photography',
    'cinematic muted lighting',
    'no people faces',
    'high quality',
  ].join(', ');
}

/**
 * Deterministic seed per case so re-runs produce the same image. Avoids
 * the user thinking the image randomly changed between deploys. FNV-1a
 * matches the picker's hash.
 */
function seedFor(caseId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < caseId.length; i++) {
    h ^= caseId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generateOne(c: CaseRow): Promise<{ ok: boolean; bytes?: number; reason?: string }> {
  const outPath = path.join(OUTPUT_DIR, `${c.id}.jpg`);
  const prompt = promptFor(c);
  const seed = seedFor(c.id);
  const url =
    `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}` +
    `?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}` +
    `&model=flux&nologo=true&enhance=false&seed=${seed}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'CasePad/1.0 (case-image generation script)' },
      // Pollinations can be slow under load — give it a generous timeout
      // via AbortController. 60s is the wall ceiling per image.
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, reason: `fetch failed: ${(err as Error).message}` };
  }

  if (!res.ok) {
    return { ok: false, reason: `http ${res.status}` };
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) {
    return { ok: false, reason: `non-image content-type: ${ct}` };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await res.arrayBuffer();
  } catch (err) {
    return { ok: false, reason: `body read failed: ${(err as Error).message}` };
  }
  if (bytes.byteLength < 1024) {
    // Pollinations sometimes returns tiny error-image PNGs (1px) on
    // overload — guard against treating those as success.
    return { ok: false, reason: `suspiciously small payload: ${bytes.byteLength}B` };
  }

  try {
    await writeFile(outPath, Buffer.from(bytes));
  } catch (err) {
    return { ok: false, reason: `write failed: ${(err as Error).message}` };
  }

  return { ok: true, bytes: bytes.byteLength };
}

async function main() {
  const opts = parseArgs(process.argv);

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supa = createClient(supaUrl, supaKey);

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('[generate-case-images] fetching cases from supabase…');
  let query = supa.from('cases').select('id, title, industry, case_type, problem_statement');
  if (opts.starter) {
    query = query.in('id', STARTER_CASE_IDS);
  } else if (opts.ids.length > 0) {
    query = query.in('id', opts.ids);
  }
  const { data: cases, error } = await query;
  if (error) {
    console.error('[generate-case-images] supabase fetch failed:', error);
    process.exit(1);
  }
  if (!cases || cases.length === 0) {
    console.warn('[generate-case-images] no cases found');
    return;
  }

  let pool: CaseRow[] = cases as CaseRow[];
  if (typeof opts.limit === 'number') pool = pool.slice(0, opts.limit);

  console.log(`[generate-case-images] candidates: ${pool.length}`);
  console.log(`[generate-case-images] output dir: ${OUTPUT_DIR}`);
  console.log(`[generate-case-images] throttle: ${opts.throttleMs}ms between requests`);

  let processed = 0;
  let skipped = 0;
  let succeeded = 0;
  let failed = 0;
  const failures: { id: string; title: string | null; reason: string }[] = [];
  const startedAt = Date.now();

  for (const c of pool) {
    processed++;
    const outPath = path.join(OUTPUT_DIR, `${c.id}.jpg`);
    if (!opts.force && (await fileExists(outPath))) {
      skipped++;
      continue;
    }

    const t0 = Date.now();
    const result = await generateOne(c);
    const tookMs = Date.now() - t0;

    if (result.ok) {
      succeeded++;
      if (processed % 10 === 0 || processed === 1) {
        const remaining = pool.length - processed;
        const avgMs = (Date.now() - startedAt) / processed;
        const etaMin = ((remaining * avgMs) / 60_000).toFixed(1);
        console.log(
          `[${processed}/${pool.length}] ✓ ${c.id} (${Math.round((result.bytes ?? 0) / 1024)}KB in ${tookMs}ms) — ETA ${etaMin}min`
        );
      }
    } else {
      failed++;
      failures.push({ id: c.id, title: c.title, reason: result.reason || 'unknown' });
      console.warn(`[${processed}/${pool.length}] ✗ ${c.id} (${c.title}): ${result.reason}`);
    }

    // Throttle between requests, even on skip (cheap), to keep pacing
    // predictable. Pollinations recommends being polite under load.
    if (opts.throttleMs > 0 && processed < pool.length) {
      await new Promise((r) => setTimeout(r, opts.throttleMs));
    }
  }

  const totalMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Processed: ${processed}`);
  console.log(`  ✓ Generated: ${succeeded}`);
  console.log(`  ⊘ Skipped (already exists): ${skipped}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`Wall time: ${totalMin} min`);
  if (failures.length > 0) {
    console.log('\nFailures (re-run will retry these):');
    for (const f of failures.slice(0, 50)) {
      console.log(`  - ${f.id} (${f.title}): ${f.reason}`);
    }
    if (failures.length > 50) console.log(`  ... and ${failures.length - 50} more`);
  }
}

main().catch((err) => {
  console.error('[generate-case-images] fatal:', err);
  process.exit(1);
});
