// scripts/ingest/inspect-headers.ts
// Inspect the first chars + sample mid-text of "one chunk" PDFs to find their case-header pattern.
import { PDFParse } from 'pdf-parse';
import { readFile } from 'fs/promises';
import path from 'path';

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: tsx inspect-headers.ts <file1.pdf> [<file2.pdf> ...]');
    process.exit(1);
  }

  for (const f of files) {
    const full = path.resolve('casebooks/raw', f);
    console.log('\n========== ' + f + ' ==========');
    try {
      const buf = await readFile(full);
      const p = new PDFParse({ data: buf });
      const r = await p.getText();
      const text = r.text;

      // Look for any line that LOOKS like a case header
      const lines = text.split(/\r?\n/);
      const candidates: { idx: number; line: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l) continue;
        // Many possible header patterns
        if (
          /^case\s*\d/i.test(l) ||
          /^case\s+(study|no|number)/i.test(l) ||
          /^case\s*[ivxlcdm]+\b/i.test(l) ||
          /^problem\s*\d/i.test(l) ||
          /^\d+\.\s*[A-Z]/.test(l) && l.length < 100 ||
          /^chapter\s*\d/i.test(l)
        ) {
          candidates.push({ idx: i, line: l.slice(0, 150) });
        }
      }
      console.log(`Total lines: ${lines.length}, header-candidates: ${candidates.length}`);
      console.log('First 20 candidates:');
      for (const c of candidates.slice(0, 20)) {
        console.log(`  L${c.idx.toString().padStart(5)}: ${c.line}`);
      }
      console.log('\nFirst 1500 chars of doc:');
      console.log(text.slice(0, 1500));
      console.log('\n--- mid sample (chars 30000-32000) ---');
      console.log(text.slice(30000, 32000));
    } catch (err) {
      console.log('FAIL: ' + (err as Error).message);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
