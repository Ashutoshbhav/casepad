// scripts/qa/generate-case-images-supabase.ts
//
// Fetches ONE case-related image per case from Pixabay and stores it in
// Supabase Storage (public bucket `case-images`), NOT in the git repo — so the
// repo stays lean while every case gets a relevant image served from a CDN.
//
// WHY PIXABAY (not AI generation): Pollinations.ai — the old keyless generator —
// now enforces a paid-tier wall (HTTP 402 on essentially every request at
// scale, confirmed 2026-05-28 and again on 2026-06-01). Pixabay is genuinely
// free with an API key (~100 requests / 60s), returns real professional stock,
// and its Content License needs no attribution for self-hosted copies.
//
// RELEVANCE: each case is matched by a priority list of search queries —
// cleaned title -> first title word -> industry -> case_type fallback — so an
// "airline profitability" case lands on aircraft/finance imagery, not a random
// office photo.
//
// Pipeline per case:  Pixabay search -> download best hit -> sharp WebP -> Storage upload
//
// Idempotent + resumable: lists what's already in the bucket and skips it, so a
// re-run after a crash/rate-limit continues where it left off.
//
// Requires PIXABAY_API_KEY in .env.local (free: https://pixabay.com/api/docs/).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/generate-case-images-supabase.ts \
//     [--limit=N] [--force] [--ids=id1,id2] [--concurrency=2] [--throttle-ms=600]
//
// The picker (src/lib/case-images/picker.ts) reads from the same bucket:
//   {SUPABASE_URL}/storage/v1/object/public/case-images/{id}.webp

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

type Supa = ReturnType<typeof createClient<any, any, any>>;

const BUCKET = 'case-images';
const PIXABAY_BASE = 'https://pixabay.com/api/';
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 560; // 4:2.8 — matches the case-row placard aspect
const WEBP_QUALITY = 80;

// Words that add noise to title-based search.
const TITLE_STOPWORDS = new Set([
  'inc', 'co', 'company', 'corp', 'corporation', 'brand', 'group',
  'ltd', 'pvt', 'llc', 'plc', 'case', 'study', 'mini', 'sample',
  'i', 'ii', 'iii', 'iv', 'of', 'the', 'a', 'an', 'and',
]);

// case_type -> photogenic fallback keyword when the title yields no hits.
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
  tags?: string;
}

function parseArgs(argv: string[]) {
  const opts = {
    limit: undefined as number | undefined,
    force: false,
    ids: [] as string[],
    concurrency: 2,
    throttleMs: 600,
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--limit=')) opts.limit = parseInt(a.slice(8), 10);
    else if (a === '--force') opts.force = true;
    else if (a.startsWith('--ids=')) opts.ids = a.slice(6).split(',').filter(Boolean);
    else if (a.startsWith('--concurrency=')) opts.concurrency = parseInt(a.slice(14), 10);
    else if (a.startsWith('--throttle-ms=')) opts.throttleMs = parseInt(a.slice(14), 10);
  }
  return opts;
}

// Priority-ordered search queries for one case (most specific first).
function candidateKeywords(c: CaseRow): string[] {
  const out: string[] = [];
  const cleaned = (c.title || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned) {
    const words = cleaned.split(' ').filter((w) => w && !TITLE_STOPWORDS.has(w));
    if (words.length > 0) {
      out.push(words.slice(0, 3).join(' '));
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

async function pixabaySearch(
  key: string,
  query: string
): Promise<PixabayHit[] | { error: string; rateLimited?: boolean }> {
  const url = new URL(PIXABAY_BASE);
  url.searchParams.set('key', key);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', 'horizontal');
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('per_page', '5');
  url.searchParams.set('lang', 'en');

  await gate();
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
    enterCooldown(parseInt(res.headers.get('x-ratelimit-reset') || '', 10));
    return { error: 'rate limited', rateLimited: true };
  }
  if (!res.ok) return { error: `search http ${res.status}` };
  // Proactive: if we're about to run out of quota this window, cool down now
  // rather than slamming into a 429 on the next request.
  const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '', 10);
  if (Number.isFinite(remaining) && remaining <= 3) {
    enterCooldown(parseInt(res.headers.get('x-ratelimit-reset') || '', 10));
  }
  try {
    const body = (await res.json()) as { hits?: PixabayHit[] };
    return Array.isArray(body.hits) ? body.hits : [];
  } catch (err) {
    return { error: `search json parse: ${(err as Error).message}` };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── GLOBAL RATE LIMITER ─────────────────────────
// Pixabay allows ~100 requests / 60s PER KEY (search AND image downloads count).
// The cardinal rule: NEVER retry-storm into a 429 — that blows the whole budget
// and keeps the key permanently throttled. Instead we (a) space every outbound
// request by MIN_GAP_MS so we stay comfortably under the cap, and (b) on a 429,
// pause ALL work globally until the limit window resets, then carry on.
const MIN_GAP_MS = 1100; // ~54 req/min — well under the 100/60s cap, leaves headroom
let lastRequestAt = 0;
let cooldownUntil = 0; // epoch ms; all requests wait until this passes

function enterCooldown(resetSeconds?: number) {
  const waitMs = (Number.isFinite(resetSeconds) && (resetSeconds as number) > 0 ? (resetSeconds as number) : 60) * 1000 + 1500;
  cooldownUntil = Math.max(cooldownUntil, Date.now() + waitMs);
}

// Space + cooldown gate that every outbound fetch must pass through.
async function gate() {
  const now = Date.now();
  if (cooldownUntil > now) {
    const wait = cooldownUntil - now;
    console.log(`[rate] cooling down ${Math.round(wait / 1000)}s for the limit window to reset…`);
    await sleep(wait);
  }
  const since = Date.now() - lastRequestAt;
  if (since < MIN_GAP_MS) await sleep(MIN_GAP_MS - since);
  lastRequestAt = Date.now();
}

// Download an image. On 429, enter a global cooldown and retry ONCE (no storm).
async function downloadBytes(
  url: string,
  retriedAfterCooldown = false
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; reason: string }> {
  await gate();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'CasePad/1.0 (case-image fetcher)', Referer: 'https://pixabay.com/' },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, reason: `download fetch: ${(err as Error).message}` };
  }
  if (res.status === 429) {
    if (retriedAfterCooldown) return { ok: false, reason: 'download http 429 (after cooldown)' };
    enterCooldown(parseInt(res.headers.get('x-ratelimit-reset') || res.headers.get('retry-after') || '', 10));
    return downloadBytes(url, true);
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
  return { ok: true, bytes };
}

async function fetchAndUpload(
  supa: Supa,
  key: string,
  c: CaseRow,
  throttleMs: number
): Promise<{ ok: boolean; bytes?: number; via?: string; reason?: string }> {
  const queries = candidateKeywords(c);

  for (const q of queries) {
    let search = await pixabaySearch(key, q);
    // On rate-limit, retry once — gate() transparently waits out the global
    // cooldown that pixabaySearch just set, so this is a polite wait, not a storm.
    if (!Array.isArray(search) && search.rateLimited) {
      search = await pixabaySearch(key, q);
    }
    if (!Array.isArray(search)) {
      console.warn(`[${c.id}] query "${q}" failed: ${search.error}`);
      continue;
    }
    if (search.length === 0) {
      await sleep(Math.max(150, throttleMs / 2));
      continue; // try next, less-specific query
    }

    const hit = search[0];
    // webformatURL (640px) is the hotlink/cache-friendly URL Pixabay intends
    // for production use and is less aggressively throttled than the full-res
    // largeImageURL; try it first, fall back to large. 640px upscales fine for
    // a darkened background placard.
    const urls = [hit.webformatURL, hit.largeImageURL].filter(Boolean) as string[];
    let dl: Awaited<ReturnType<typeof downloadBytes>> | null = null;
    for (const u of urls) {
      dl = await downloadBytes(u);
      if (dl.ok) break;
    }
    if (!dl || !dl.ok) {
      console.warn(`[${c.id}] download for "${q}" failed: ${dl?.reason ?? 'no url'}`);
      continue;
    }

    // Resize + compress to WebP.
    let webp: Buffer;
    try {
      webp = await sharp(Buffer.from(dl.bytes))
        .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover', position: 'centre' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (err) {
      return { ok: false, reason: `webp convert: ${(err as Error).message}` };
    }

    const { error: upErr } = await supa.storage
      .from(BUCKET)
      .upload(`${c.id}.webp`, webp, { contentType: 'image/webp', upsert: true });
    if (upErr) return { ok: false, reason: `upload: ${upErr.message}` };

    return { ok: true, bytes: webp.byteLength, via: q };
  }

  return { ok: false, reason: 'no hits for any query' };
}

async function listExisting(supa: Supa): Promise<Set<string>> {
  const done = new Set<string>();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supa.storage
      .from(BUCKET)
      .list('', { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) {
      console.warn('[list existing] failed (treating bucket as empty):', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const o of data) {
      if (o.name.endsWith('.webp')) done.add(o.name.replace(/\.webp$/, ''));
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return done;
}

// Paginated case fetch — PostgREST caps a single select at 1000 rows, so we
// page through with .range() until a short page comes back. (This is the bug
// that previously limited generation to the first 1000 of 2,659 cases.)
async function fetchAllCases(supa: Supa, ids: string[]): Promise<CaseRow[]> {
  if (ids.length > 0) {
    const { data, error } = await supa.from('cases').select('id, title, industry, case_type').in('id', ids);
    if (error) throw error;
    return (data ?? []) as CaseRow[];
  }
  const all: CaseRow[] = [];
  const page = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supa
      .from('cases')
      .select('id, title, industry, case_type')
      .order('created_at', { ascending: false })
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as CaseRow[];
    all.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return all;
}

async function main() {
  const opts = parseArgs(process.argv);

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!supaUrl || !supaKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  if (!pixabayKey) {
    console.error('Missing PIXABAY_API_KEY in env. Get a free key at https://pixabay.com/api/docs/ and add it to .env.local');
    process.exit(1);
  }
  const supa = createClient(supaUrl, supaKey);

  const { error: bucketErr } = await supa.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/webp'],
  });
  if (bucketErr && !/exist/i.test(bucketErr.message)) {
    console.error('[bucket] create failed:', bucketErr.message);
    process.exit(1);
  }
  console.log(`[bucket] "${BUCKET}" ready (public).`);

  console.log('[cases] fetching (paginated) from supabase…');
  let pool = await fetchAllCases(supa, opts.ids);
  if (typeof opts.limit === 'number') pool = pool.slice(0, opts.limit);
  console.log(`[cases] candidates: ${pool.length}`);

  const existing = opts.force ? new Set<string>() : await listExisting(supa);
  if (existing.size > 0) console.log(`[skip] ${existing.size} already in bucket — resuming.`);
  const todo = pool.filter((c) => opts.force || !existing.has(c.id));
  console.log(`[todo] ${todo.length} to fetch (concurrency=${opts.concurrency}, throttle=${opts.throttleMs}ms)`);

  let succeeded = 0;
  let failed = 0;
  let totalBytes = 0;
  const failures: { id: string; title: string | null; reason: string }[] = [];
  const startedAt = Date.now();
  let nextIndex = 0;
  let processed = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= todo.length) return;
      const c = todo[i];
      const result = await fetchAndUpload(supa, pixabayKey!, c, opts.throttleMs);
      processed++;
      if (result.ok) {
        succeeded++;
        totalBytes += result.bytes ?? 0;
        if (processed % 25 === 0 || processed === 1) {
          const avgMs = (Date.now() - startedAt) / processed;
          const etaMin = (((todo.length - processed) * avgMs) / opts.concurrency / 60_000).toFixed(1);
          const mb = (totalBytes / 1024 / 1024).toFixed(1);
          console.log(`[${processed}/${todo.length}] ✓ ${c.id} via "${result.via}" (${Math.round((result.bytes ?? 0) / 1024)}KB) — ${mb}MB — ETA ~${etaMin}min`);
        }
      } else {
        failed++;
        failures.push({ id: c.id, title: c.title, reason: result.reason || 'unknown' });
        console.warn(`[${processed}/${todo.length}] ✗ ${c.id} (${c.title}): ${result.reason}`);
      }
      if (opts.throttleMs > 0) await sleep(opts.throttleMs);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, () => worker()));

  const totalMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log('\n=== DONE ===');
  console.log(`  ✓ Fetched+uploaded: ${succeeded}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Storage added: ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  Wall time: ${totalMin} min`);
  if (failures.length > 0) {
    console.log('\nFailures (re-run retries these):');
    for (const f of failures.slice(0, 40)) console.log(`  - ${f.id} (${f.title}): ${f.reason}`);
    if (failures.length > 40) console.log(`  ... and ${failures.length - 40} more`);
  }
}

main().catch((err) => {
  console.error('[generate-case-images-supabase] fatal:', err);
  process.exit(1);
});
