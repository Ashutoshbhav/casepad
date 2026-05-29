// scripts/qa/generate-case-images-pixabay.ts
//
// Pixabay-backed case image fetcher. Replaces the Pollinations.ai script
// after Pollinations turned out to enforce a paid-tier wall at scale
// (HTTP 402 on ~98 of 100 requests, 2026-05-28).
//
// Pixabay is genuinely free + unlimited with an API key (100 req/60s soft
// cap). We download the chosen image to /public/case-photos/cases/{id}.jpg
// — under Pixabay's Content License this requires no attribution (only the
// live-API hot-link path under API Terms requires photographer credit).
// Self-hosting also lets us serve images without the "must cache 24h" API
// constraint biting us.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/generate-case-images-pixabay.ts \
//     [--limit=N] [--starter] [--force] [--ids=...] [--throttle-ms=1500]

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { STARTER_CASE_IDS } from '../../src/lib/starter-cases';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'case-photos', 'cases');
const PIXABAY_BASE = 'https://pixabay.com/api/';

// Words that add noise to title-based search ("InvestCo" → "investment"
// not "investco"; "DigiBooks Inc." → "digibooks" not "digibooks inc"). We
// strip these BEFORE picking a keyword.
const TITLE_STOPWORDS = new Set([
  'inc', 'co', 'company', 'corp', 'corporation', 'brand', 'group',
  'ltd', 'pvt', 'llc', 'plc', 'case', 'study', 'mini', 'sample',
  'i', 'ii', 'iii', 'iv', 'of', 'the', 'a', 'an', 'and',
]);

// Map case_type → generic fallback keyword when the title yields 0 hits.
// Chosen to be photogenic (business meeting, factory, etc.) rather than
// literal ("profitability" returns boring chart screenshots).
const CASE_TYPE_FALLBACK_KEYWORD: Record<string, string> = {
  profitability: 'business meeting',
  market_entry: 'world map',
  operations: 'factory floor',
  estimation: 'calculator',
  pricing: 'price tag',
  mna: 'handshake',
  gtm: 'product launch',
  other: 'office',
};

interface CaseRow {
  id: string;
  title: string | null;
  industry: string | null;
  case_type: string | null;
}

interface PixabayHit {
  id: number;
  largeImageURL?: string;
  webformatURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  tags?: string;
  user?: string;
}

interface PixabayResponse {
  total?: number;
  totalHits?: number;
  hits?: PixabayHit[];
}

function parseArgs(argv: string[]) {
  const opts = {
    limit: undefined as number | undefined,
    starter: false,
    force: false,
    ids: [] as string[],
    throttleMs: 1500,
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
 * Extract a search-friendly keyword from a case row. Returns an array of
 * candidate queries in priority order — caller tries each until one returns
 * a hit. Cheap heuristics, no LLM:
 *   1. Title with stopwords stripped
 *   2. First meaningful word of the title
 *   3. Industry
 *   4. case_type-mapped generic ("business meeting", etc.)
 */
function candidateKeywords(c: CaseRow): string[] {
  const out: string[] = [];
  const rawTitle = (c.title || '').toLowerCase();
  // Normalise: strip non-letters/spaces, collapse whitespace.
  const cleaned = rawTitle.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned) {
    const words = cleaned.split(' ').filter((w) => w && !TITLE_STOPWORDS.has(w));
    if (words.length > 0) {
      // Full cleaned title (truncate to 3 words — Pixabay scores on each)
      out.push(words.slice(0, 3).join(' '));
      // Just the first word as a focused fallback
      if (words.length > 1) out.push(words[0]);
    }
  }
  const industry = (c.industry || '').toLowerCase().trim();
  if (industry && !out.includes(industry)) out.push(industry);
  const caseType = (c.case_type || 'other').toLowerCase();
  const fallback = CASE_TYPE_FALLBACK_KEYWORD[caseType] || CASE_TYPE_FALLBACK_KEYWORD.other;
  if (!out.includes(fallback)) out.push(fallback);
  return out;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function pixabaySearch(
  key: string,
  query: string
): Promise<PixabayHit[] | { error: string }> {
  const url = new URL(PIXABAY_BASE);
  url.searchParams.set('key', key);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', 'horizontal');
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('per_page', '5');
  url.searchParams.set('lang', 'en');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'CasePad/1.0 (case-image fetcher)' },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return { error: `search fetch: ${(err as Error).message}` };
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('x-ratelimit-reset') || res.headers.get('retry-after') || '60';
    return { error: `rate limited (retry after ${retryAfter}s)` };
  }
  if (!res.ok) {
    return { error: `search http ${res.status}` };
  }
  let body: PixabayResponse;
  try {
    body = (await res.json()) as PixabayResponse;
  } catch (err) {
    return { error: `search json parse: ${(err as Error).message}` };
  }
  return Array.isArray(body.hits) ? body.hits : [];
}

async function downloadImage(url: string, outPath: string): Promise<{ ok: boolean; bytes?: number; reason?: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'CasePad/1.0 (case-image fetcher)' },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, reason: `download fetch: ${(err as Error).message}` };
  }
  if (!res.ok) return { ok: false, reason: `download http ${res.status}` };
  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) return { ok: false, reason: `non-image content-type: ${ct}` };
  let bytes: ArrayBuffer;
  try {
    bytes = await res.arrayBuffer();
  } catch (err) {
    return { ok: false, reason: `body read: ${(err as Error).message}` };
  }
  if (bytes.byteLength < 1024) return { ok: false, reason: `suspiciously small: ${bytes.byteLength}B` };
  try {
    await writeFile(outPath, Buffer.from(bytes));
  } catch (err) {
    return { ok: false, reason: `write: ${(err as Error).message}` };
  }
  return { ok: true, bytes: bytes.byteLength };
}

async function findAndDownload(
  c: CaseRow,
  key: string,
  throttleMs: number
): Promise<{ ok: boolean; bytes?: number; reason?: string; via?: string }> {
  const outPath = path.join(OUTPUT_DIR, `${c.id}.jpg`);
  const queries = candidateKeywords(c);

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const search = await pixabaySearch(key, q);
    if (!Array.isArray(search)) {
      // Per-query error (e.g. 429) — propagate up if rate-limited so caller
      // can back off; otherwise try the next query.
      if (search.error.includes('rate limited')) {
        return { ok: false, reason: search.error };
      }
      // Other errors: log + try next query.
      console.warn(`[${c.id}] query "${q}" failed: ${search.error}`);
      continue;
    }
    if (search.length === 0) {
      // Brief throttle between sub-queries on the same case to be polite
      // even when zero-hit. Half the inter-case throttle so we don't
      // stretch wall time too much on cascading 0-hits.
      if (i < queries.length - 1 && throttleMs > 0) {
        await new Promise((r) => setTimeout(r, throttleMs / 2));
      }
      continue;
    }
    const hit = search[0];
    const url = hit.largeImageURL || hit.webformatURL;
    if (!url) {
      console.warn(`[${c.id}] query "${q}" hit had no usable image URL`);
      continue;
    }
    const dl = await downloadImage(url, outPath);
    if (dl.ok) {
      return { ok: true, bytes: dl.bytes, via: q };
    }
    return { ok: false, reason: dl.reason };
  }

  return { ok: false, reason: `no hits across ${queries.length} queries: ${queries.join(' | ')}` };
}

async function main() {
  const opts = parseArgs(process.argv);

  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) {
    console.error('Missing PIXABAY_API_KEY in env (.env.local)');
    console.error('Sign up at https://pixabay.com/accounts/register/ → API page returns your key.');
    process.exit(1);
  }
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supa = createClient(supaUrl, supaKey);

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('[generate-case-images-pixabay] fetching cases from supabase…');
  let query = supa.from('cases').select('id, title, industry, case_type');
  if (opts.starter) query = query.in('id', STARTER_CASE_IDS);
  else if (opts.ids.length > 0) query = query.in('id', opts.ids);
  const { data: cases, error } = await query;
  if (error) {
    console.error('supabase fetch failed:', error);
    process.exit(1);
  }
  if (!cases || cases.length === 0) {
    console.warn('no cases found');
    return;
  }

  let pool: CaseRow[] = cases as CaseRow[];
  if (typeof opts.limit === 'number') pool = pool.slice(0, opts.limit);

  console.log(`candidates: ${pool.length}`);
  console.log(`output dir: ${OUTPUT_DIR}`);
  console.log(`throttle: ${opts.throttleMs}ms between requests`);

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
    const result = await findAndDownload(c, pixabayKey, opts.throttleMs);
    const tookMs = Date.now() - t0;

    if (result.ok) {
      succeeded++;
      if (processed % 10 === 0 || processed === 1) {
        const remaining = pool.length - processed;
        const avgMs = (Date.now() - startedAt) / processed;
        const etaMin = ((remaining * avgMs) / 60_000).toFixed(1);
        console.log(
          `[${processed}/${pool.length}] ✓ ${c.id} (${Math.round((result.bytes ?? 0) / 1024)}KB in ${tookMs}ms via "${result.via}") — ETA ${etaMin}min`
        );
      }
    } else {
      failed++;
      failures.push({ id: c.id, title: c.title, reason: result.reason || 'unknown' });
      // Print every failure for now — useful while we tune keyword strategy.
      console.warn(`[${processed}/${pool.length}] ✗ ${c.id} (${c.title}): ${result.reason}`);
      // If we hit a rate limit, sleep longer before continuing.
      if (result.reason?.includes('rate limited')) {
        console.warn('   …backing off 60s for rate limit');
        await new Promise((r) => setTimeout(r, 60_000));
      }
    }

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
  console.error('fatal:', err);
  process.exit(1);
});
