import { discoverAll } from './discover';
import { downloadOne } from './download';
import { parsePdfFile, splitIntoCaseChunks } from './parse';
import { extractCase } from './extract';
import { upsertCasebook, insertCase, bumpCasebookCount } from './insert';
import { Throttle } from './throttle';
import { log } from './log';
import path from 'path';

const groqThrottle = new Throttle(25, 60_000); // 25 req/min, under 30 RPM cap

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await log('info', 'orchestrator', `start (dryRun=${dryRun})`);

  const discovered = await discoverAll();
  await log('info', 'discover', `found ${discovered.length} candidate PDFs`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { school, pdfUrl } of discovered) {
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

    const casebookTitle = path.basename(dl.localPath, '.pdf');
    let casebookId: string | null = null;
    if (!dryRun) {
      try {
        casebookId = await upsertCasebook(school, null, casebookTitle, pdfUrl, dl.localPath);
      } catch (err) {
        await log('error', 'insert', `casebook upsert failed: ${(err as Error).message}`);
        continue;
      }
    }

    let parsed;
    try {
      parsed = await parsePdfFile(dl.localPath);
    } catch (err) {
      await log('error', 'parse', `${dl.localPath} failed: ${(err as Error).message}`);
      totalFailed++;
      continue;
    }
    if (parsed.ocrUsed && parsed.text.length < 500) {
      await log('warn', 'parse', `${dl.localPath} appears scanned — deferred`);
      continue;
    }

    const chunks = splitIntoCaseChunks(parsed.text);
    await log('info', 'parse', `${path.basename(dl.localPath)} → ${chunks.length} chunks`);

    let inserted = 0;
    for (const chunk of chunks) {
      if (chunk.length < 200) continue;
      await groqThrottle.acquire();
      const row = await extractCase(chunk);
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
    await log('info', 'extract', `${path.basename(dl.localPath)} → ${inserted} inserted`);
  }

  await log('info', 'orchestrator', `done. inserted=${totalInserted} skipped=${totalSkipped} failed=${totalFailed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
