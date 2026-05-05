// Fallback ingester for casebook PDFs WITHOUT clean `Case N:` headers.
// The main orchestrator skips these to avoid garbage extraction. This
// script slides a window across the full text, asks the LLM to identify
// any case present in each window, and inserts non-duplicates.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/ingest/ingest-windowed.ts <pdf-prefix>
// Example:
//   npx tsx --env-file=.env.local scripts/ingest/ingest-windowed.ts iim-a
//
// Or to process every PDF that has no header-detected pattern:
//   npx tsx --env-file=.env.local scripts/ingest/ingest-windowed.ts --all-headerless

import { readFile, readdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { extractCase } from './extract';
import { upsertCasebook, insertCase } from './insert';

const RAW_DIR = resolve('casebooks/raw');
const WINDOW_SIZE = 7000; // chars per window (under 8k slice extract.ts uses)
const WINDOW_STEP = 6000; // 1k overlap so cases at boundaries don't get cut
const CONCURRENCY = 4;

const argFilter = process.argv[2];
if (!argFilter) {
  console.error('Usage: ingest-windowed.ts <pdf-name-prefix> | --all-headerless');
  process.exit(1);
}

const HEADER_RE = /(?:^|\n)\s*Case\s+(?:Study\s+|No\.?\s*|#\s*)?(?:\d+|[IVXLCDM]+)\b/gi;

function inferSchool(filename: string): string {
  const base = basename(filename, extname(filename));
  const sep = base.indexOf('__');
  if (sep > 0) return base.slice(0, sep);
  // Conservative default: collapse to first underscore/space token
  return base.split(/[_\-\s]/)[0].toLowerCase() || 'manual';
}

function inferTitle(filename: string): string {
  const base = basename(filename, extname(filename));
  const sep = base.indexOf('__');
  return sep > 0 ? base.slice(sep + 2).replace(/[-_]/g, ' ') : base.replace(/[-_]/g, ' ');
}

async function* slideWindows(text: string): AsyncGenerator<{ start: number; chunk: string }> {
  for (let i = 0; i < text.length; i += WINDOW_STEP) {
    const chunk = text.slice(i, i + WINDOW_SIZE);
    if (chunk.trim().length < 1500) continue; // too small to be a case
    yield { start: i, chunk };
  }
}

function normalizeTitleKey(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).slice(0, 6).join(' ');
}

async function pickFiles(): Promise<string[]> {
  const all = (await readdir(RAW_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (argFilter === '--all-headerless') {
    // Scan each PDF: read text, run header regex, return only those without hits
    const out: string[] = [];
    for (const f of all) {
      try {
        const buf = await readFile(resolve(RAW_DIR, f));
        const parser = new PDFParse({ data: buf });
        const result = await parser.getText();
        const headers = result.text.match(HEADER_RE) || [];
        if (headers.length === 0 && result.text.length > 50_000) {
          out.push(f);
        }
      } catch (err) {
        console.error(`[scan] ${f}: ${(err as Error).message}`);
      }
    }
    return out;
  }
  return all.filter((f) => f.toLowerCase().includes(argFilter.toLowerCase()));
}

async function processFile(filename: string): Promise<{ inserted: number; skipped: number; failed: number }> {
  const path = resolve(RAW_DIR, filename);
  const school = inferSchool(filename);
  const titleHint = inferTitle(filename);
  console.log(`\n=== ${filename} (school=${school}) ===`);

  let text = '';
  try {
    const buf = await readFile(path);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    text = result.text;
    console.log(`   parsed: ${result.total} pages, ${text.length} chars`);
  } catch (err) {
    console.error(`   parse failed: ${(err as Error).message}`);
    return { inserted: 0, skipped: 0, failed: 1 };
  }

  const casebookId = await upsertCasebook(school, null, titleHint, `local:${filename}`, path);
  console.log(`   casebook id: ${casebookId}`);

  // Build window list, then process with concurrency pool.
  const windows: { start: number; chunk: string }[] = [];
  for await (const w of slideWindows(text)) windows.push(w);
  console.log(`   windows: ${windows.length}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  const seenTitles = new Set<string>();

  const queue = [...windows];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const w = queue.shift();
      if (!w) break;
      try {
        const row = await extractCase(w.chunk);
        if (!row || !row.title || typeof row.title !== 'string') {
          skipped++;
          continue;
        }
        const key = normalizeTitleKey(row.title);
        if (key.length < 6 || seenTitles.has(key)) {
          skipped++;
          continue;
        }
        seenTitles.add(key);
        const insertRow = {
          title: String(row.title).slice(0, 200),
          industry: row.industry || 'consulting',
          case_type: row.case_type || 'other',
          difficulty: row.difficulty || 'medium',
          source: row.source || `${school} (${filename})`,
          casebook_id: casebookId,
          problem_statement: row.problem_statement || '',
          interviewer_notes: row.interviewer_notes ?? [],
          ideal_structure: row.ideal_structure ?? { framework: null, branches: [], key_insights: [] },
          tags: Array.from(new Set([...(row.tags ?? []), school])),
          provenance: { ingester: 'ingest-windowed', source_pdf: filename, window_start: w.start },
        };
        const res = await insertCase(insertRow);
        if (res.inserted) {
          inserted++;
          console.log(`   [ok] @${w.start}: "${insertRow.title}"`);
        } else {
          skipped++;
        }
      } catch (err) {
        failed++;
        console.error(`   [err] @${w.start}: ${(err as Error).message}`);
      }
    }
  });
  await Promise.all(workers);
  console.log(`   ✦ ${filename}: inserted=${inserted} skipped=${skipped} failed=${failed}`);
  return { inserted, skipped, failed };
}

async function main() {
  console.log(`[ingest-windowed] mode: ${argFilter}`);
  const files = await pickFiles();
  console.log(`[ingest-windowed] matched ${files.length} PDFs`);
  files.forEach((f) => console.log(`  - ${f}`));

  let totals = { inserted: 0, skipped: 0, failed: 0 };
  for (const f of files) {
    const r = await processFile(f);
    totals.inserted += r.inserted;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  }
  console.log(`\n[ingest-windowed] ALL DONE — inserted=${totals.inserted} skipped=${totals.skipped} failed=${totals.failed}`);
}

main().catch((err) => {
  console.error('[ingest-windowed] fatal:', err);
  process.exit(1);
});
