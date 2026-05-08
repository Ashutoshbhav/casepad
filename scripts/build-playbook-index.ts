// scripts/build-playbook-index.ts
//
// Parses docs/playbook/*.md into a flat list of indexed findings,
// then writes to src/lib/groq/playbook-data.json.
//
// Each finding becomes: { id, file, section, text, sourceUrl?, keywords[] }
//
// Run via: npx tsx scripts/build-playbook-index.ts
// Or as a build step in CI before next build.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PLAYBOOK_DIR = path.join(ROOT, 'docs', 'playbook');
const OUTPUT_FILE = path.join(ROOT, 'src', 'lib', 'groq', 'playbook-data.json');

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
  'here', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom',
  'and', 'or', 'but', 'if', 'else', 'for', 'with', 'without', 'on',
  'in', 'at', 'to', 'of', 'from', 'by', 'as', 'about', 'into', 'over',
  'under', 'after', 'before', 'between', 'through', 'during',
  'i', 'you', 'he', 'she', 'we', 'us', 'me', 'my', 'your', 'our',
  'so', 'than', 'too', 'very', 'just', 'only', 'also', 'some', 'any',
  'all', 'each', 'every', 'both', 'either', 'neither', 'such', 'same',
  'other', 'another', 'one', 'two', 'three', 'four', 'five',
  'no', 'not', 'nor', 'don', 't', 's', 'd', 'll', 've', 're', 'm',
  'real', 'really', 'thing', 'things', 'way', 'ways', 'use', 'used',
  'get', 'got', 'going', 'go', 'see', 'know', 'said', 'say', 'says',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function extractSourceUrl(text: string): string | undefined {
  // Match the first markdown link: [name](url)
  const m = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  return m ? m[2] : undefined;
}

interface PlaybookFinding {
  id: string;
  file: string;
  section: string;
  number: number;
  text: string;
  sourceUrl?: string;
  keywords: string[];
}

async function main() {
  const files = (await readdir(PLAYBOOK_DIR))
    .filter((f) => f.endsWith('.md'))
    .sort();

  const findings: PlaybookFinding[] = [];

  for (const file of files) {
    const content = await readFile(path.join(PLAYBOOK_DIR, file), 'utf8');
    const lines = content.split('\n');

    let currentSection = 'unknown';
    for (const line of lines) {
      // Track section headers (## Heading or ### Subheading)
      const headerMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
        continue;
      }

      // Match numbered findings: "1. Some text..." or "1. **Bold text** — rationale"
      const findingMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (!findingMatch) continue;

      const number = parseInt(findingMatch[1], 10);
      const rawText = findingMatch[2].trim();
      // Strip markdown formatting for keyword extraction (keep for display)
      const cleanForKeywords = rawText
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`]/g, '');

      const keywords = Array.from(new Set(tokenize(cleanForKeywords)));
      if (keywords.length === 0) continue; // skip empty/all-stopword findings

      findings.push({
        id: `${file.replace(/\.md$/, '')}#${number}`,
        file,
        section: currentSection,
        number,
        text: rawText,
        sourceUrl: extractSourceUrl(rawText),
        keywords,
      });
    }
  }

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify({ generated: new Date().toISOString(), count: findings.length, findings }, null, 2),
    'utf8'
  );

  console.log(`[playbook-index] Indexed ${findings.length} findings from ${files.length} files`);
  console.log(`[playbook-index] Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[playbook-index] FAILED:', err);
  process.exit(1);
});
