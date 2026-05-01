import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface VerifyResult {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: number | null;
  reason?: string;
}

async function verifyOne(url: string): Promise<VerifyResult> {
  try {
    // Try HEAD first (fast). Fall back to GET if HEAD is rejected.
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow' });
    }
    const ct = res.headers.get('content-type');
    const cl = res.headers.get('content-length');
    const ctLower = ct?.toLowerCase() ?? '';
    const isPdfCt = ctLower.includes('pdf');
    // GitHub serves raw blobs as application/octet-stream — treat as PDF when
    // the URL ends in .pdf. Same logic for known direct-PDF hosts that don't
    // bother setting application/pdf.
    const urlEndsPdf = /\.pdf(\?|$)/i.test(url);
    const isOctetButPdfUrl = ctLower.includes('octet-stream') && urlEndsPdf;
    const isPdf = isPdfCt || isOctetButPdfUrl;
    return {
      url,
      ok: res.ok && isPdf,
      status: res.status,
      contentType: ct,
      contentLength: cl ? parseInt(cl, 10) : null,
      reason: !res.ok ? `http ${res.status}` : !isPdf ? `not pdf (got ${ct})` : undefined,
    };
  } catch (err) {
    return { url, ok: false, status: null, contentType: null, contentLength: null, reason: (err as Error).message };
  }
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npm run verify:urls -- <path-to-url-list.txt>');
    console.error('Input: one URL per line. Lines starting with # are ignored.');
    process.exit(1);
  }

  const text = await readFile(inputPath, 'utf8');
  const urls = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  console.error(`Verifying ${urls.length} URLs...`);

  const results: VerifyResult[] = [];
  for (let i = 0; i < urls.length; i++) {
    const r = await verifyOne(urls[i]);
    results.push(r);
    const tag = r.ok ? '\x1b[32mOK \x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.error(`${tag} [${i + 1}/${urls.length}] ${r.url} — ${r.reason ?? `${r.status} ${r.contentType ?? ''}`}`);
  }

  const okCount = results.filter((r) => r.ok).length;
  console.error(`\n${okCount}/${results.length} verified.`);

  // Write JSON report next to input
  const out = inputPath.replace(/\.[^.]+$/, '') + '.verified.json';
  await writeFile(out, JSON.stringify(results, null, 2));
  console.error(`Report: ${out}`);

  // Also write a clean list of OK URLs for easy ingestion
  const okList = inputPath.replace(/\.[^.]+$/, '') + '.verified.txt';
  await writeFile(okList, results.filter((r) => r.ok).map((r) => r.url).join('\n') + '\n');
  console.error(`Clean URL list: ${okList}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
