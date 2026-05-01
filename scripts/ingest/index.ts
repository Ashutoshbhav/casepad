import { discoverAll } from './discover';
import { downloadOne } from './download';
import { parsePdfFile, splitIntoCaseChunks, isLikelyWholeDocument } from './parse';
import { extractCase } from './extract';
import { upsertCasebook, insertCase, bumpCasebookCount } from './insert';
import { Throttle } from './throttle';
import { log } from './log';
import path from 'path';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';

const groqThrottle = new Throttle(25, 60_000); // 25 req/min, under 30 RPM cap

const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');

type Target = {
  school: string;
  pdfUrl: string;
  localPath: string;
  alreadyDownloaded: boolean;
};

/**
 * Scan casebooks/raw/ for PDFs and infer school from filename prefix.
 * Convention (per download.ts localPathFor): `<school>__<filename>.pdf`.
 * Files lacking the `__` separator default to school = 'manual'.
 */
async function scanLocalPdfs(): Promise<Target[]> {
  let entries: string[];
  try {
    entries = await readdir(RAW_DIR);
  } catch {
    return [];
  }
  const targets: Target[] = [];
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.pdf')) continue;
    const localPath = path.join(RAW_DIR, name);
    const sepIdx = name.indexOf('__');
    const school = sepIdx > 0 ? name.slice(0, sepIdx) : 'manual';
    targets.push({
      school,
      pdfUrl: pathToFileURL(localPath).href,
      localPath,
      alreadyDownloaded: true,
    });
  }
  return targets;
}

async function gatherTargets(fromDisk: boolean): Promise<Target[]> {
  if (fromDisk) {
    return scanLocalPdfs();
  }
  const discovered = await discoverAll();
  return discovered.map(({ school, pdfUrl }) => ({
    school,
    pdfUrl,
    localPath: '', // filled in by downloadOne
    alreadyDownloaded: false,
  }));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fromDisk = process.argv.includes('--from-disk');
  await log('info', 'orchestrator', `start (dryRun=${dryRun}, fromDisk=${fromDisk})`);

  const targets = await gatherTargets(fromDisk);
  if (fromDisk) {
    await log('info', 'local-source', `found ${targets.length} local PDF(s) in casebooks/raw/`);
    if (targets.length === 0) {
      await log('info', 'orchestrator', 'no local PDFs to process');
      return;
    }
  } else {
    await log('info', 'discover', `found ${targets.length} candidate PDFs`);
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const target of targets) {
    const { school, pdfUrl } = target;
    let localPath: string;

    if (target.alreadyDownloaded) {
      localPath = target.localPath;
      await log('info', 'local-source', `${school} using ${path.basename(localPath)}`);
    } else {
      const dl = await downloadOne(school, pdfUrl);
      if (dl.status === 'failed') {
        await log('warn', 'download', `${school} ${pdfUrl} failed: ${dl.reason}`);
        totalFailed++;
        continue;
      }
      if (dl.status === 'skipped') {
        await log('info', 'download', `${school} skipped (${path.basename(dl.localPath)})`);
      } else {
        await log('info', 'download', `${school} downloaded ${path.basename(dl.localPath)}`);
      }
      localPath = dl.localPath;
    }

    const casebookTitle = path.basename(localPath, '.pdf');
    let casebookId: string | null = null;
    if (!dryRun) {
      try {
        casebookId = await upsertCasebook(school, null, casebookTitle, pdfUrl, localPath);
      } catch (err) {
        await log('error', 'insert', `casebook upsert failed: ${(err as Error).message}`);
        continue;
      }
    }

    let parsed;
    try {
      parsed = await parsePdfFile(localPath);
    } catch (err) {
      await log('error', 'parse', `${localPath} failed: ${(err as Error).message}`);
      totalFailed++;
      continue;
    }
    if (parsed.ocrUsed && parsed.text.length < 500) {
      await log('warn', 'parse', `${localPath} appears scanned — deferred`);
      continue;
    }

    const chunks = splitIntoCaseChunks(parsed.text);
    if (chunks.length === 1 && isLikelyWholeDocument(chunks[0])) {
      await log(
        'warn',
        'parse',
        `${path.basename(localPath)} → 1 chunk (${chunks[0].length} chars) — case headers not detected, skipping to avoid garbage extraction`
      );
      totalSkipped++;
      continue;
    }
    await log('info', 'parse', `${path.basename(localPath)} → ${chunks.length} chunks`);

    let inserted = 0;
    for (const chunk of chunks) {
      if (chunk.length < 200) continue;
      await groqThrottle.acquire();
      let row;
      try {
        row = await extractCase(chunk);
      } catch (err) {
        await log('error', 'extract', `chunk failed after retries: ${(err as Error).message.slice(0, 200)}`);
        totalFailed++;
        continue;
      }
      if (!row || !row.title || !row.problem_statement) {
        totalSkipped++;
        continue;
      }
      if (dryRun) {
        await log('info', 'extract', `[dry] would insert: ${row.title}`);
        continue;
      }
      const result = await insertCase({
        title: row.title,
        industry: row.industry || 'other',
        case_type: row.case_type || 'other',
        difficulty: row.difficulty || 'medium',
        source: row.source ?? school,
        casebook_id: casebookId,
        problem_statement: row.problem_statement,
        interviewer_notes: row.interviewer_notes ?? [],
        ideal_structure: row.ideal_structure ?? {},
        tags: row.tags ?? [],
        provenance: { school, casebook_title: casebookTitle, source_url: pdfUrl },
      });
      if (result.inserted) {
        inserted++;
        totalInserted++;
      } else {
        totalSkipped++;
      }
    }

    if (casebookId && inserted > 0) await bumpCasebookCount(casebookId, inserted);
    await log('info', 'extract', `${path.basename(localPath)} → ${inserted} inserted`);
  }

  await log('info', 'orchestrator', `done. inserted=${totalInserted} skipped=${totalSkipped} failed=${totalFailed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
