// scripts/ingest/download-all.ts
// Pre-download all PDFs in sources.json (sources + extra_pdf_urls) to casebooks/raw/.
// Runs WITHOUT any API keys — pure I/O. Useful to warm the disk cache before running
// the full ingest pipeline.
import sources from './sources.json' with { type: 'json' };
import { downloadOne } from './download';
import { discoverAll } from './discover';

async function main() {
  console.log('Pre-download starting...');

  // Stage 1: targets from extra_pdf_urls
  const fromExtra = (sources as any).extra_pdf_urls.map((url: string) => ({
    school: 'manual',
    pdfUrl: url,
  }));

  // Stage 2 (optional): targets from discover (may add a few)
  let fromDiscover: { school: string; pdfUrl: string }[] = [];
  if (process.argv.includes('--with-discover')) {
    console.log('Including discover stage...');
    fromDiscover = await discoverAll();
  }

  const all = [...fromExtra, ...fromDiscover];
  console.log(`Downloading ${all.length} PDFs (extra=${fromExtra.length}, discover=${fromDiscover.length})...`);

  let ok = 0, skipped = 0, failed = 0;
  for (let i = 0; i < all.length; i++) {
    const { school, pdfUrl } = all[i];
    const r = await downloadOne(school, pdfUrl);
    const tag = r.status === 'downloaded' ? '\x1b[32mGOT \x1b[0m'
              : r.status === 'skipped'    ? '\x1b[36mSKIP\x1b[0m'
              :                              '\x1b[31mFAIL\x1b[0m';
    process.stdout.write(`${tag} [${i + 1}/${all.length}] ${pdfUrl} ${r.reason ? '— ' + r.reason : ''}\n`);
    if (r.status === 'downloaded') ok++;
    else if (r.status === 'skipped') skipped++;
    else failed++;
  }

  console.log(`\nDone. downloaded=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
