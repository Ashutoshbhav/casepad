// scripts/ingest/audit-pdfs.ts
// Audit all PDFs in casebooks/raw/ — report parseability, OCR-need, chunk count, est cases.
// Pure I/O + parsing, no API calls.
import { readdir, writeFile, stat, mkdir } from 'fs/promises';
import path from 'path';
import { parsePdfFile, splitIntoCaseChunks, needsOcr } from './parse';

interface Audit {
  file: string;
  sizeKB: number;
  ok: boolean;
  numPages: number | null;
  textLength: number | null;
  charsPerPage: number | null;
  ocrNeeded: boolean;
  chunkCount: number;
  estCases: number;
  error?: string;
}

const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');
const OUT_PATH = path.resolve(process.cwd(), 'docs/research/pdf-audit.json');

async function auditOne(file: string): Promise<Audit> {
  const full = path.join(RAW_DIR, file);
  try {
    const parsed = await parsePdfFile(full);
    const chunks = splitIntoCaseChunks(parsed.text);
    const charsPerPage = parsed.numPages > 0 ? Math.round(parsed.text.length / parsed.numPages) : 0;
    const ocrNeeded = needsOcr(parsed.text, parsed.numPages);
    const estCases = chunks.length;
    return {
      file,
      sizeKB: 0,
      ok: true,
      numPages: parsed.numPages,
      textLength: parsed.text.length,
      charsPerPage,
      ocrNeeded,
      chunkCount: chunks.length,
      estCases,
    };
  } catch (err) {
    return {
      file,
      sizeKB: 0,
      ok: false,
      numPages: null,
      textLength: null,
      charsPerPage: null,
      ocrNeeded: false,
      chunkCount: 0,
      estCases: 0,
      error: (err as Error).message,
    };
  }
}

async function main() {
  const files = (await readdir(RAW_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Auditing ${files.length} PDFs...`);

  const results: Audit[] = [];
  for (let i = 0; i < files.length; i++) {
    const r = await auditOne(files[i]);
    try {
      const s = await stat(path.join(RAW_DIR, files[i]));
      r.sizeKB = Math.round(s.size / 1024);
    } catch {}

    const tag = !r.ok ? '\x1b[31mFAIL\x1b[0m'
              : r.ocrNeeded ? '\x1b[33mOCR \x1b[0m'
              : r.chunkCount > 1 ? '\x1b[32mOK  \x1b[0m'
              : '\x1b[36mONE \x1b[0m';
    console.log(`${tag} [${i + 1}/${files.length}] ${files[i]} — pages=${r.numPages}, chars/pg=${r.charsPerPage}, chunks=${r.chunkCount}`);
    results.push(r);
  }

  const okCount = results.filter((r) => r.ok).length;
  const ocrCount = results.filter((r) => r.ok && r.ocrNeeded).length;
  const goodCount = results.filter((r) => r.ok && !r.ocrNeeded && r.chunkCount > 1).length;
  const oneChunkCount = results.filter((r) => r.ok && !r.ocrNeeded && r.chunkCount === 1).length;
  const failCount = results.filter((r) => !r.ok).length;
  const totalEstCases = results.reduce((a, r) => a + r.estCases, 0);

  console.log(`\nSummary:`);
  console.log(`  Total PDFs: ${results.length}`);
  console.log(`  Parseable (chunks > 1): ${goodCount}`);
  console.log(`  Parseable but ONE chunk (regex miss?): ${oneChunkCount}`);
  console.log(`  Needs OCR (deferred): ${ocrCount}`);
  console.log(`  Hard parse failures: ${failCount}`);
  console.log(`  Total estimated cases (chunks): ${totalEstCases}`);
  console.log(`  Parseable total (ok): ${okCount}`);

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nReport: ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
