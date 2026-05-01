// Identify duplicate PDFs in casebooks/raw/ by SHA-256 and move all but one
// copy of each duplicate set into casebooks/raw/_dupes/ — keeps the shortest
// filename (canonical) in casebooks/raw/.
import { readdir, stat, mkdir, rename } from 'fs/promises';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

const RAW = path.resolve('casebooks/raw');
const DUPE_DIR = path.join(RAW, '_dupes');

async function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

const dryRun = process.argv.includes('--dry-run');

const files = (await readdir(RAW)).filter((f) => f.toLowerCase().endsWith('.pdf'));
console.log(`Hashing ${files.length} PDFs...`);

const byHash = new Map();
for (let i = 0; i < files.length; i++) {
  const full = path.join(RAW, files[i]);
  const s = await stat(full);
  if (!s.isFile()) continue;
  const h = await sha256(full);
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(files[i]);
  process.stdout.write(`\r  ${i + 1}/${files.length}`);
}
console.log();

const duplicateSets = [...byHash.values()].filter((arr) => arr.length > 1);
let moved = 0;

if (duplicateSets.length === 0) {
  console.log('No duplicates found.');
} else {
  if (!dryRun) await mkdir(DUPE_DIR, { recursive: true });
  console.log(`\n${duplicateSets.length} duplicate sets found:`);
  for (const set of duplicateSets) {
    set.sort((a, b) => a.length - b.length);
    const keep = set[0];
    const drop = set.slice(1);
    console.log(`  KEEP: ${keep}`);
    for (const d of drop) {
      console.log(`  DROP: ${d}`);
      if (!dryRun) {
        await rename(path.join(RAW, d), path.join(DUPE_DIR, d));
        moved++;
      }
    }
  }
}

console.log(`\n${dryRun ? '[dry-run] would move' : 'Moved'}: ${moved} file(s)`);
console.log(`Unique PDFs remaining in casebooks/raw/: ${files.length - moved}`);
