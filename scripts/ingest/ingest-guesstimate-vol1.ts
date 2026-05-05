// One-shot ingester for the SRCC 180DC Guesstimates Vol 1 PDF. Runs
// independently of the main orchestrator because guesstimates need a
// different extraction prompt + different chunking strategy (page-based,
// not "Case N:" header-based).
//
// Usage:
//   npx tsx scripts/ingest/ingest-guesstimate-vol1.ts
//   npx tsx scripts/ingest/ingest-guesstimate-vol1.ts --dry-run
//
// Idempotent — re-running skips duplicates by (casebook_id, title).

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { extractGuesstimate } from './extract-guesstimate';
import { upsertCasebook, insertCase, bumpCasebookCount } from './insert';

const PDF_PATH = resolve('casebooks/raw/srcc-180dc__guesstimates-vol-1.pdf');
const SCHOOL = 'srcc-180dc';
const TITLE = 'Guesstimates Vol 1 (180 Degrees Consulting, SRCC)';
const SOURCE_URL = 'manual:srcc-180dc__guesstimates-vol-1.pdf';
const SOURCE_LABEL = '180 Degrees Consulting, SRCC — Guesstimates Vol 1';

// Pages 1-9 are cover/index/theory/cheatsheet — skip. Pages 56+ are
// thank-you + team credits — skip. Tunable based on the actual book.
const PAGE_FIRST_PROBLEM = 10;
const PAGE_LAST_PROBLEM = 55;

const DRY = process.argv.includes('--dry-run');

function splitByPage(text: string): { pageNum: number; body: string }[] {
  // Pages are delimited by "-- N of TOTAL --" markers inserted by pdf-parse.
  const re = /--\s*(\d+)\s+of\s+\d+\s*--/g;
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return [{ pageNum: 1, body: text }];

  const pages: { pageNum: number; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const pageNum = Number(matches[i][1]);
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text.slice(start, end).trim();
    if (body.length > 50) pages.push({ pageNum, body });
  }
  return pages;
}

// Some guesstimates span 2 pages. Pair-merge consecutive pages where the
// second one looks like a continuation (no clear new title, starts with
// math/numbers/percentages instead of a problem heading).
function mergeContinuations(pages: { pageNum: number; body: string }[]): { pageNum: number; body: string }[] {
  const out: { pageNum: number; body: string }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const cur = pages[i];
    const next = pages[i + 1];
    const looksLikeContinuation =
      next &&
      next.body.length < 800 &&
      !/^[A-Z][A-Z\s]{8,}$/m.test(next.body.split('\n')[0]?.trim() || '') &&
      !/^(Q\.|Question|Estimate|Guesstimate|Number of|Market size|Revenue of|Annual|How many)/i.test(next.body);
    if (looksLikeContinuation) {
      out.push({ pageNum: cur.pageNum, body: `${cur.body}\n\n${next.body}` });
      i++; // consume next
    } else {
      out.push(cur);
    }
  }
  return out;
}

async function main() {
  console.log(`[ingest-guesstimate] PDF: ${PDF_PATH}`);
  console.log(`[ingest-guesstimate] mode: ${DRY ? 'DRY RUN' : 'LIVE WRITES'}`);

  const buf = await readFile(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  console.log(`[ingest-guesstimate] parsed: ${result.total} pages, ${result.text.length} chars`);

  const pages = splitByPage(result.text);
  const filtered = pages.filter((p) => p.pageNum >= PAGE_FIRST_PROBLEM && p.pageNum <= PAGE_LAST_PROBLEM);
  const merged = mergeContinuations(filtered);
  console.log(`[ingest-guesstimate] candidate problem pages: ${filtered.length} (after merge: ${merged.length})`);

  let casebookId: string | null = null;
  if (!DRY) {
    casebookId = await upsertCasebook(SCHOOL, 2024, TITLE, SOURCE_URL, PDF_PATH);
    console.log(`[ingest-guesstimate] casebook id: ${casebookId}`);
  }

  // Parallel pool — 6 in flight. Groq 8b-instant on the free tier responds
  // in 60-90s under queue load, so sequential is unacceptable (~45 min).
  // Six concurrent saturates the queue without hitting the 30 RPM limit.
  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  const CONCURRENCY = 6;

  async function processOne({ pageNum, body }: { pageNum: number; body: string }) {
    try {
      const row = await extractGuesstimate(body, `${SOURCE_LABEL} (page ${pageNum})`);
      if (!row || !row.title || row.title === null) {
        skipped++;
        console.log(`[skip] page ${pageNum}: not a guesstimate`);
        return;
      }

      const tags = Array.from(new Set([
        ...((row.tags as string[]) ?? []),
        'guesstimate',
        'srcc-180dc-vol-1',
      ]));

      const insertRow = {
        title: String(row.title).slice(0, 200),
        industry: (row.industry as string) || 'consulting',
        case_type: 'estimation',
        difficulty: (row.difficulty as string) || 'medium',
        source: (row.source as string) || SOURCE_LABEL,
        casebook_id: casebookId,
        problem_statement: (row.problem_statement as string) || '',
        interviewer_notes: (row.interviewer_notes as unknown[]) ?? [],
        ideal_structure: (row.ideal_structure as Record<string, unknown>) ?? { framework: null, branches: [], key_insights: [] },
        tags,
        provenance: {
          ingester: 'ingest-guesstimate-vol1',
          source_pdf: 'srcc-180dc__guesstimates-vol-1.pdf',
          page_number: pageNum,
          methodology: 'soumya-3-step',
        },
      };

      if (DRY) {
        console.log(`[dry] page ${pageNum} → "${insertRow.title}" (${insertRow.difficulty}, framework=${(insertRow.ideal_structure as { framework?: string }).framework})`);
        inserted++;
        return;
      }

      const res = await insertCase(insertRow);
      if (res.inserted) {
        inserted++;
        console.log(`[ok] page ${pageNum} → "${insertRow.title}"`);
      } else {
        skipped++;
        console.log(`[skip] page ${pageNum}: ${res.reason}`);
      }
    } catch (err) {
      failed++;
      console.error(`[err] page ${pageNum}:`, (err as Error).message);
    }
  }

  // Worker pool — pulls from the queue until empty.
  const queue = [...merged];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await processOne(item);
    }
  });
  await Promise.all(workers);

  if (!DRY && casebookId && inserted > 0) {
    await bumpCasebookCount(casebookId, inserted);
  }

  console.log(`\n[ingest-guesstimate] done — inserted=${inserted} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error('[ingest-guesstimate] fatal:', err);
  process.exit(1);
});
