// Public Google Drive folder downloader. Static HTML scraping doesn't work
// because Drive renders the file grid via JS XHR. So we open the folder in
// headless Chromium, wait for the grid to populate, scroll until everything
// is loaded, then extract (file_id, file_name) pairs from the rendered DOM
// and download each via the public uc?export=download endpoint.
//
// Usage:
//   node scripts/ingest/drive-download.mjs <folderId> <prefix>
// Example:
//   node scripts/ingest/drive-download.mjs 1nvIBvImef8A67KbKF6qVdLAwvVedcF3n casecomp
//
// Files land in casebooks/raw/<prefix>__<sanitized-name>.<ext>
// Re-running skips files that already exist on disk.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const folderId = process.argv[2];
const prefix = process.argv[3] || 'drive';
if (!folderId) {
  console.error('Usage: node drive-download.mjs <folderId> [prefix]');
  process.exit(1);
}

const OUT_DIR = path.resolve('casebooks/raw');
fs.mkdirSync(OUT_DIR, { recursive: true });

function sanitize(name) {
  return name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
}

function downloadOne(fileId, destPath) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const fetchUrl = (u, hops = 0) => {
      if (hops > 5) return reject(new Error('too many redirects'));
      https.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, hops + 1);
        }
        // Drive's anti-virus warning page is HTML — detect by content-type.
        const ct = res.headers['content-type'] || '';
        if (ct.includes('text/html')) {
          // Capture the cookie-confirm token from the warning page and re-issue
          // with &confirm=<token>. Simplified: just collect HTML, find token, retry.
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            const m = body.match(/confirm=([0-9A-Za-z_]+)/) ||
                      body.match(/"confirmToken":"([^"]+)"/) ||
                      body.match(/name="confirm"\s+value="([^"]+)"/);
            if (m) {
              fetchUrl(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=${m[1]}`, hops + 1);
            } else {
              reject(new Error(`html response, no confirm token (file may need auth): ${ct}`));
            }
          });
          return;
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
        file.on('error', reject);
      }).on('error', reject);
    };
    fetchUrl(url);
  });
}

console.log(`[drive] launching headless Chromium…`);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
const page = await ctx.newPage();

console.log(`[drive] opening folder: ${folderId}`);
await page.goto(`https://drive.google.com/drive/folders/${folderId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Give the JS app time to render the file grid (XHR + render).
await page.waitForTimeout(5000);

// Scroll to load all items.
let prevHeight = 0;
for (let i = 0; i < 25; i++) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  if (h === prevHeight && i > 2) break;
  prevHeight = h;
  await page.evaluate(() => window.scrollBy(0, 2000));
  await page.waitForTimeout(700);
}

// Strategy: parse the embedded JS data block (Drive embeds the folder file
// list as a JSON-ish array inside a <script> tag). Look for `window['_DRIVE_ivd']`
// or AF_initDataCallback payloads, then grep for [<file_id>, <file_name>] tuples.
const files = await page.evaluate(() => {
  // Get all rendered text from the page including embedded script JSON.
  // First try the live DOM — fastest path if Drive renders <a> elements.
  const out = new Map();
  for (const a of document.querySelectorAll('a[href*="/file/d/"], a[href*="/document/d/"], a[href*="/presentation/d/"], a[href*="/spreadsheets/d/"]')) {
    const m = a.getAttribute('href')?.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]{20,})/);
    if (!m) continue;
    const id = m[1];
    const name = a.getAttribute('aria-label') || a.textContent?.trim() || '';
    if (name) out.set(id, name);
  }

  // If DOM didn't yield anything, fall back to parsing the JS data blob.
  if (out.size === 0) {
    // Drive embeds folder data inside <script> tags as nested arrays. Look for
    // the AF_initDataCallback pattern, decode it, then regex (id, name) tuples.
    const scripts = [...document.querySelectorAll('script')].map((s) => s.textContent || '').join('\n');
    // Match every ["FILE_ID", "FILENAME.pdf"] tuple in the embedded data.
    const re = /\["([A-Za-z0-9_-]{25,44})",\s*"([^"\\]{3,250}\.(?:pdf|pptx?|docx?|xlsx?|zip))"/gi;
    let m;
    while ((m = re.exec(scripts)) !== null) {
      const id = m[1], name = m[2];
      if (!out.has(id)) out.set(id, name);
    }
  }

  return [...out.entries()].map(([id, name]) => ({ id, name }));
});
console.log(`[drive] enumerated ${files.length} files`);

// Diagnostic: take a screenshot + dump first 2000 chars of HTML if no files found.
if (files.length === 0) {
  await page.screenshot({ path: 'drive-debug.png', fullPage: false });
  const snippet = await page.evaluate(() => document.body.innerHTML.slice(0, 3000));
  console.log('[drive] DIAG snippet:', snippet.slice(0, 500));
  console.log('[drive] screenshot → drive-debug.png');
}
await browser.close();

if (files.length === 0) {
  console.log('[drive] zero files — folder may be private or use newer markup. Aborting.');
  process.exit(2);
}

// Filter to PDFs/PPTs/DOCs
const supported = files.filter(({ name }) => /\.(pdf|pptx?|docx?|xlsx?)$/i.test(name));
console.log(`[drive] supported (pdf/ppt/doc): ${supported.length}`);

let downloaded = 0;
let skipped = 0;
let failed = 0;
for (const { id, name } of supported) {
  const ext = (name.match(/\.([A-Za-z0-9]+)$/)?.[1] || 'bin').toLowerCase();
  const base = sanitize(name.replace(/\.[A-Za-z0-9]+$/, ''));
  const dest = path.join(OUT_DIR, `${prefix}__${base}.${ext}`);
  if (fs.existsSync(dest)) {
    skipped++;
    console.log(`[skip] ${path.basename(dest)} (already exists)`);
    continue;
  }
  try {
    await downloadOne(id, dest);
    const size = fs.statSync(dest).size;
    if (size < 1024) {
      // Drive sometimes returns a 0-byte HTML page; treat as failure.
      fs.unlinkSync(dest);
      throw new Error(`download too small: ${size} bytes`);
    }
    downloaded++;
    console.log(`[ok]  ${path.basename(dest)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (e) {
    failed++;
    console.error(`[err] ${name}: ${e.message}`);
  }
}

console.log(`\n[drive] done — downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
process.exit(failed > 0 && downloaded === 0 ? 1 : 0);
