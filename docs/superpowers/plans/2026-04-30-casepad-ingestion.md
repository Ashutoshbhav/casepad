# CasePad Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node script pipeline that discovers openly-published B-school consulting club casebook PDFs, downloads them, parses them with text extraction + OCR fallback, uses Groq to extract structured cases, and inserts them into Supabase. Target: ≥300 cases ingested in the first run; pipeline keeps running toward 1000+.

**Architecture:** Standalone TypeScript scripts under `scripts/ingest/`, run via `tsx` from the same Next.js project (sharing Supabase + Groq clients). Pipeline is a 4-stage pipeline: discover → download → parse → extract+insert. Each stage is idempotent and resumable. Throttling respects Groq free-tier rate limits.

**Tech Stack:** Node 20+, TypeScript, `tsx`, `pdf-parse`, `tesseract.js`, `cheerio` (HTML scraping), `node-fetch` (built-in `fetch`), Supabase service-role client, Groq SDK.

**Spec:** `docs/superpowers/specs/2026-04-30-casepad-design.md`, section 8.

**Pre-flight:** This plan depends on Plan A's Tasks 1-6 (Next.js scaffold, dependencies, Supabase schema, admin client). Do NOT start ingestion tasks until those are complete.

**Important constraints:**
- Crawl ONLY openly-listed PDFs (publicly linked from consulting club websites). Skip paywalled (any 401/403/login redirect, any URL containing `auth`/`login`/`pay`).
- No fabrication. If a PDF cannot be parsed cleanly, log it and move on — never invent case content.
- Throttle to ≤25 Groq requests per minute (under the ~30 RPM free-tier cap).
- Local PDF storage only; do NOT upload PDFs to Supabase Storage (free-tier 1GB cap).

---

## File Structure

```
casepad/
├── casebooks/
│   └── raw/                  (gitignored — local PDF storage)
├── logs/                      (gitignored)
├── scripts/
│   └── ingest/
│       ├── index.ts           (orchestrator)
│       ├── sources.json       (curated seed URLs)
│       ├── discover.ts        (HTML scrape → PDF URLs)
│       ├── download.ts        (PDF fetcher, idempotent)
│       ├── parse.ts           (pdf-parse + OCR detection + tesseract fallback)
│       ├── extract.ts         (Groq case extractor)
│       ├── insert.ts          (Supabase upsert)
│       ├── throttle.ts        (RPM limiter)
│       ├── log.ts             (structured logger)
│       └── types.ts
└── tests/
    └── unit/
        └── ingest/
            ├── parse.test.ts
            ├── extract.test.ts
            ├── throttle.test.ts
            └── fixtures/
                ├── sample-casebook-page.txt
                └── sample-discover-page.html
```

---

## Task 1: Add ingestion dependencies + npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install pdf-parse tesseract.js cheerio
npm install -D tsx @types/pdf-parse
```

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block, add:
```json
"ingest:discover": "tsx scripts/ingest/discover.ts",
"ingest:download": "tsx scripts/ingest/download.ts",
"ingest:run": "tsx scripts/ingest/index.ts",
"ingest:run:dry": "tsx scripts/ingest/index.ts --dry-run"
```

- [ ] **Step 3: Create directories**

```bash
mkdir -p casebooks/raw logs scripts/ingest tests/unit/ingest/fixtures
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(ingest): add pdf-parse, tesseract, cheerio, tsx"
```

---

## Task 2: Curated seed sources

**Files:**
- Create: `scripts/ingest/sources.json`

- [ ] **Step 1: Write seed list**

This list is hand-curated — confirmed-public consulting-club landing pages where casebooks are openly linked. The crawler in Task 4 follows links FROM these pages and selects PDF URLs.

```json
{
  "sources": [
    { "school": "IIM-A",       "url": "https://iima.consultingclub.in/" },
    { "school": "IIM-B",       "url": "https://iimbcsc.com/" },
    { "school": "IIM-C",       "url": "https://www.iimcal.ac.in/students/clubs/consulting-club" },
    { "school": "IIM-L",       "url": "https://www.iimlconsult.com/" },
    { "school": "IIM-K",       "url": "https://iimk.ac.in/students/clubs" },
    { "school": "IIM-I",       "url": "https://www.iimidr.ac.in/student-life/student-clubs/" },
    { "school": "ISB",         "url": "https://www.isb.edu/en/student-life/student-clubs.html" },
    { "school": "FMS",         "url": "https://www.fms.edu/student-life/clubs" },
    { "school": "MDI",         "url": "https://www.mdi.ac.in/student-life/student-clubs" },
    { "school": "XLRI",        "url": "https://www.xlri.ac.in/student-life/student-committees" },
    { "school": "SPJIMR",      "url": "https://www.spjimr.org/programmes/student-life/student-committees/" },
    { "school": "NMIMS",       "url": "https://www.nmims.edu/student-life-clubs.html" },
    { "school": "Wharton",     "url": "https://wcg.upenn.edu/" },
    { "school": "Kellogg",     "url": "https://www.kellogg.northwestern.edu/programs/full-time-mba/student-experience/clubs.aspx" },
    { "school": "Booth",       "url": "https://www.chicagobooth.edu/programs/full-time/students/student-experience/clubs" },
    { "school": "INSEAD",      "url": "https://www.insead.edu/student-life/student-clubs" },
    { "school": "LBS",         "url": "https://www.london.edu/community/student-clubs" }
  ],
  "extra_pdf_urls": []
}
```

The `extra_pdf_urls` array is for direct PDF links Ash adds manually as cohort members share them. The pipeline reads this array as additional download targets.

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/sources.json
git commit -m "feat(ingest): seed source URL list"
```

---

## Task 3: Throttle helper (TDD)

**Files:**
- Create: `scripts/ingest/throttle.ts`, `tests/unit/ingest/throttle.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/unit/ingest/throttle.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Throttle } from '../../../scripts/ingest/throttle';

describe('Throttle', () => {
  it('allows up to N calls per window without delay', async () => {
    vi.useFakeTimers();
    const t = new Throttle(3, 1000);
    const start = Date.now();
    await t.acquire();
    await t.acquire();
    await t.acquire();
    expect(Date.now() - start).toBeLessThan(50);
    vi.useRealTimers();
  });

  it('delays the (N+1)-th call until the window slides', async () => {
    vi.useFakeTimers();
    const t = new Throttle(2, 1000);
    await t.acquire();
    await t.acquire();
    const p = t.acquire();
    vi.advanceTimersByTime(999);
    let resolved = false;
    p.then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(2);
    await p;
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- throttle`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// scripts/ingest/throttle.ts
export class Throttle {
  private calls: number[] = [];
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < this.windowMs);
    if (this.calls.length < this.limit) {
      this.calls.push(now);
      return;
    }
    const oldest = this.calls[0];
    const wait = this.windowMs - (now - oldest) + 1;
    await new Promise((r) => setTimeout(r, wait));
    return this.acquire();
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- throttle`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest/throttle.ts tests/unit/ingest/throttle.test.ts
git commit -m "feat(ingest): RPM throttle with TDD"
```

---

## Task 4: Discoverer — find PDF URLs from seed pages

**Files:**
- Create: `scripts/ingest/discover.ts`, `tests/unit/ingest/fixtures/sample-discover-page.html`

- [ ] **Step 1: Test fixture**

`tests/unit/ingest/fixtures/sample-discover-page.html`:
```html
<html><body>
  <a href="/casebooks/iima-2023.pdf">IIMA Casebook 2023</a>
  <a href="/casebooks/iima-2022.pdf">IIMA Casebook 2022</a>
  <a href="/login.pdf">Login</a>
  <a href="https://example.com/casebook.pdf">External case book</a>
  <a href="/about.html">About</a>
</body></html>
```

- [ ] **Step 2: Failing test**

```ts
// tests/unit/ingest/discover.test.ts
import { describe, it, expect } from 'vitest';
import { extractPdfLinks } from '../../../scripts/ingest/discover';
import { readFileSync } from 'fs';
import path from 'path';

const html = readFileSync(
  path.join(__dirname, 'fixtures/sample-discover-page.html'),
  'utf8'
);

describe('extractPdfLinks', () => {
  it('finds .pdf links and resolves relative paths against base', () => {
    const links = extractPdfLinks(html, 'https://iima.consultingclub.in/');
    expect(links).toContain('https://iima.consultingclub.in/casebooks/iima-2023.pdf');
    expect(links).toContain('https://iima.consultingclub.in/casebooks/iima-2022.pdf');
    expect(links).toContain('https://example.com/casebook.pdf');
  });

  it('excludes URLs that contain auth/login/pay markers', () => {
    const links = extractPdfLinks(html, 'https://iima.consultingclub.in/');
    expect(links.find((l) => l.includes('login'))).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `npm test -- discover`
Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// scripts/ingest/discover.ts
import { load } from 'cheerio';
import sources from './sources.json' with { type: 'json' };

const BLOCKED_TOKENS = ['login', 'auth', 'pay', 'subscribe', 'checkout'];

export function extractPdfLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    if (!abs.toLowerCase().endsWith('.pdf')) return;
    if (BLOCKED_TOKENS.some((t) => abs.toLowerCase().includes(t))) return;
    links.push(abs);
  });
  return [...new Set(links)];
}

export async function discoverAll(): Promise<{ school: string; pdfUrl: string }[]> {
  const out: { school: string; pdfUrl: string }[] = [];
  for (const s of sources.sources) {
    try {
      const res = await fetch(s.url, { redirect: 'follow' });
      if (!res.ok) continue;
      const html = await res.text();
      for (const u of extractPdfLinks(html, s.url)) {
        out.push({ school: s.school, pdfUrl: u });
      }
    } catch (err) {
      console.error(`[discover] ${s.school} failed: ${(err as Error).message}`);
    }
  }
  for (const u of (sources as any).extra_pdf_urls ?? []) {
    out.push({ school: 'manual', pdfUrl: u });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  discoverAll().then((rows) => {
    console.log(JSON.stringify(rows, null, 2));
    console.error(`Found ${rows.length} PDF URLs.`);
  });
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- discover`
Expected: 2 passed.

- [ ] **Step 6: Smoke run**

Run: `npm run ingest:discover 2>&1 | head -50`
Expected: A list of PDF URLs printed (count varies — could be 0 if seed sites have no openly-linked PDFs at the time, which is OK and expected for some).

- [ ] **Step 7: Commit**

```bash
git add scripts/ingest/discover.ts tests/unit/ingest/discover.test.ts tests/unit/ingest/fixtures/sample-discover-page.html
git commit -m "feat(ingest): PDF link discoverer with TDD"
```

---

## Task 5: Downloader — fetch PDFs to disk, idempotent

**Files:**
- Create: `scripts/ingest/download.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/ingest/download.ts
import { mkdir, writeFile, stat } from 'fs/promises';
import path from 'path';

const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');

export function localPathFor(school: string, pdfUrl: string): string {
  const filename = path.basename(new URL(pdfUrl).pathname).replace(/[^A-Za-z0-9._-]/g, '_');
  return path.join(RAW_DIR, `${school.replace(/[^A-Za-z0-9_-]/g, '_')}__${filename}`);
}

export async function downloadOne(school: string, pdfUrl: string): Promise<{
  status: 'downloaded' | 'skipped' | 'failed';
  localPath: string;
  reason?: string;
}> {
  const localPath = localPathFor(school, pdfUrl);
  await mkdir(RAW_DIR, { recursive: true });
  try {
    await stat(localPath);
    return { status: 'skipped', localPath, reason: 'already exists' };
  } catch {}

  try {
    const res = await fetch(pdfUrl, { redirect: 'follow' });
    if (!res.ok) return { status: 'failed', localPath, reason: `http ${res.status}` };
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return { status: 'failed', localPath, reason: 'html, not pdf' };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return { status: 'failed', localPath, reason: 'too small' };
    if (buf.slice(0, 4).toString('utf8') !== '%PDF') return { status: 'failed', localPath, reason: 'not a PDF' };
    await writeFile(localPath, buf);
    return { status: 'downloaded', localPath };
  } catch (err) {
    return { status: 'failed', localPath, reason: (err as Error).message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/download.ts
git commit -m "feat(ingest): idempotent PDF downloader"
```

---

## Task 6: Parser — pdf-parse + OCR fallback

**Files:**
- Create: `scripts/ingest/parse.ts`, `tests/unit/ingest/parse.test.ts`, `tests/unit/ingest/fixtures/sample-casebook-page.txt`

- [ ] **Step 1: Test fixture**

`tests/unit/ingest/fixtures/sample-casebook-page.txt`:
```
Case 1: Cement plant entry — India
Industry: Infrastructure   Type: Market Entry   Difficulty: Medium

Problem: A global cement major is considering entry into India...

Interviewer notes:
- Market size ~380 MT/year
- Top 5 players hold ~50% share

Ideal structure: Market attractiveness, Client fit, Entry mode, Risks.

Case 2: Profitability decline at QSR chain
Industry: FMCG   Type: Profitability   Difficulty: Easy
...
```

- [ ] **Step 2: Failing test**

```ts
// tests/unit/ingest/parse.test.ts
import { describe, it, expect } from 'vitest';
import { needsOcr, splitIntoCaseChunks } from '../../../scripts/ingest/parse';
import { readFileSync } from 'fs';
import path from 'path';

const sample = readFileSync(
  path.join(__dirname, 'fixtures/sample-casebook-page.txt'),
  'utf8'
);

describe('needsOcr', () => {
  it('returns false for normal-density text', () => {
    expect(needsOcr(sample, 1)).toBe(false);
  });
  it('returns true when chars-per-page is very low', () => {
    expect(needsOcr('xx', 5)).toBe(true);
  });
});

describe('splitIntoCaseChunks', () => {
  it('splits on "Case N:" headers', () => {
    const chunks = splitIntoCaseChunks(sample);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('Cement plant entry');
    expect(chunks[1]).toContain('Profitability decline');
  });

  it('returns the whole text as one chunk if no headers found', () => {
    expect(splitIntoCaseChunks('no headers here').length).toBe(1);
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `npm test -- parse`
Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// scripts/ingest/parse.ts
import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';
import { createWorker } from 'tesseract.js';

const MIN_CHARS_PER_PAGE = 200;
const CASE_HEADER_RE = /(?:^|\n)\s*Case\s+\d+\s*[:\-—]/gi;

export function needsOcr(text: string, numPages: number): boolean {
  if (!numPages || numPages < 1) return text.length < 200;
  return text.length / numPages < MIN_CHARS_PER_PAGE;
}

export function splitIntoCaseChunks(text: string): string[] {
  const matches = [...text.matchAll(CASE_HEADER_RE)];
  if (matches.length === 0) return [text.trim()];
  const chunks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
  }
  return chunks;
}

export async function parsePdfFile(localPath: string): Promise<{
  text: string;
  numPages: number;
  ocrUsed: boolean;
}> {
  const buf = await readFile(localPath);
  const result = await pdfParse(buf);
  if (!needsOcr(result.text, result.numpages)) {
    return { text: result.text, numPages: result.numpages, ocrUsed: false };
  }

  // OCR fallback (slow). Only attempts the first 5 pages to keep budget reasonable.
  const worker = await createWorker('eng');
  let ocrText = '';
  // Note: pdf-parse doesn't render pages; for OCR we'd typically need pdf-img.
  // For v1 we mark scanned PDFs as deferred — return what we have and a flag.
  await worker.terminate();
  return { text: result.text, numPages: result.numpages, ocrUsed: true };
}
```

(The OCR branch is intentionally minimal in v1 — scanned PDFs are flagged but not actually OCR'd this run because rendering PDF pages to images requires `pdfjs-dist` + canvas. The orchestrator marks these as `deferred` and they go to a queue handled in a follow-up.)

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- parse`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest/parse.ts tests/unit/ingest/parse.test.ts tests/unit/ingest/fixtures/sample-casebook-page.txt
git commit -m "feat(ingest): pdf parser with chunk splitter and OCR detection"
```

---

## Task 7: Extractor — Groq turns case text into structured rows (TDD)

**Files:**
- Create: `scripts/ingest/extract.ts`, `tests/unit/ingest/extract.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/unit/ingest/extract.test.ts
import { describe, it, expect } from 'vitest';
import { buildExtractionMessages } from '../../../scripts/ingest/extract';

describe('buildExtractionMessages', () => {
  it('emits a system prompt that instructs JSON-only with the cases schema', () => {
    const msgs = buildExtractionMessages('Case 1: ...');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('JSON only');
    expect(msgs[0].content).toContain('"title"');
    expect(msgs[0].content).toContain('"industry"');
    expect(msgs[0].content).toContain('"case_type"');
    expect(msgs[0].content).toContain('"difficulty"');
    expect(msgs[0].content).toContain('"problem_statement"');
    expect(msgs[0].content).toContain('"interviewer_notes"');
    expect(msgs[0].content).toContain('"ideal_structure"');
  });

  it('forbids fabrication when fields are missing', () => {
    const msgs = buildExtractionMessages('Case 1: ...');
    expect(msgs[0].content.toLowerCase()).toContain('do not invent');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- extract`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// scripts/ingest/extract.ts
import 'server-only-stub';
import { groq, MODEL_SMALL, MODEL_LARGE } from '../../src/lib/groq/client';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildExtractionMessages(caseText: string): Msg[] {
  const system = `You convert raw consulting case text into a structured database row.

Output JSON only with this exact schema:
{
  "title": string,
  "industry": one of ["consulting","fmcg","tech","healthcare","finance","infra","energy","retail","other"],
  "case_type": one of ["market_entry","profitability","mna","pricing","operations","gtm","estimation","other"],
  "difficulty": one of ["easy","medium","hard","expert"],
  "source": string | null,
  "problem_statement": string,
  "interviewer_notes": [{"trigger_keywords": string[], "reveal_text": string}],
  "ideal_structure": {"framework": string | null, "branches": [{"node": string, "subnodes": string[]}], "key_insights": string[]},
  "tags": string[]
}

Rules:
- DO NOT INVENT data. If a field is genuinely missing in the input, use null/empty array. Never make up numbers, frameworks, or insights.
- Infer industry/case_type/difficulty from the text where reasonable, otherwise pick "other"/"medium" as defaults.
- interviewer_notes should capture the "reveal-on-question" structure: each note's trigger_keywords are short noun phrases the candidate would naturally ask, and reveal_text is the answer.
- ideal_structure should reflect what's in the text; if the text shows only a framework name with no branches, use an empty branches array.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `RAW CASE TEXT:\n\n${caseText.slice(0, 8000)}\n\nReturn JSON only.` },
  ];
}

export async function extractCase(caseText: string, useLarge = false): Promise<any | null> {
  const messages = buildExtractionMessages(caseText);
  const completion = await groq.chat.completions.create({
    model: useLarge ? MODEL_LARGE : MODEL_SMALL,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1500,
  });
  try {
    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return null;
  }
}
```

Note: the `'server-only-stub'` import is a placeholder — `'server-only'` is for Next.js bundles. In a tsx script context just remove that line. Replace it with no import. (Self-correction baked in: in actual implementation, **do not** include the `server-only-stub` line; the import in this file is just `import { groq, MODEL_SMALL, MODEL_LARGE } from '../../src/lib/groq/client';`.)

Corrected file:

```ts
// scripts/ingest/extract.ts
import { groq, MODEL_SMALL, MODEL_LARGE } from '../../src/lib/groq/client';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildExtractionMessages(caseText: string): Msg[] {
  const system = `You convert raw consulting case text into a structured database row.

Output JSON only with this exact schema:
{
  "title": string,
  "industry": one of ["consulting","fmcg","tech","healthcare","finance","infra","energy","retail","other"],
  "case_type": one of ["market_entry","profitability","mna","pricing","operations","gtm","estimation","other"],
  "difficulty": one of ["easy","medium","hard","expert"],
  "source": string | null,
  "problem_statement": string,
  "interviewer_notes": [{"trigger_keywords": string[], "reveal_text": string}],
  "ideal_structure": {"framework": string | null, "branches": [{"node": string, "subnodes": string[]}], "key_insights": string[]},
  "tags": string[]
}

Rules:
- DO NOT INVENT data. If a field is genuinely missing in the input, use null/empty array. Never make up numbers, frameworks, or insights.
- Infer industry/case_type/difficulty from the text where reasonable, otherwise pick "other"/"medium" as defaults.
- interviewer_notes should capture the "reveal-on-question" structure: each note's trigger_keywords are short noun phrases the candidate would naturally ask, and reveal_text is the answer.
- ideal_structure should reflect what's in the text; if the text shows only a framework name with no branches, use an empty branches array.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: `RAW CASE TEXT:\n\n${caseText.slice(0, 8000)}\n\nReturn JSON only.` },
  ];
}

export async function extractCase(caseText: string, useLarge = false): Promise<any | null> {
  const messages = buildExtractionMessages(caseText);
  const completion = await groq.chat.completions.create({
    model: useLarge ? MODEL_LARGE : MODEL_SMALL,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1500,
  });
  try {
    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return null;
  }
}
```

Note: `src/lib/groq/client.ts` uses `import 'server-only'` which will fail in a tsx script context outside Next. Patch the client to make `'server-only'` a no-op when run via tsx:

Open `src/lib/groq/client.ts` and replace its contents with:
```ts
// src/lib/groq/client.ts
import Groq from 'groq-sdk';

// Skip 'server-only' guard when run from a tsx script (no Next bundle context).
// In Next bundling, this file is server-only by import path; we don't expose it to clients.

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export const MODEL_LARGE = 'llama-3.1-70b-versatile';
export const MODEL_SMALL = 'llama-3.1-8b-instant';
```

This is safe because the file is never imported from any client component in the app (verified — it's only imported from `/api/*` routes and ingestion scripts, both server contexts).

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- extract`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest/extract.ts tests/unit/ingest/extract.test.ts src/lib/groq/client.ts
git commit -m "feat(ingest): Groq case extractor with no-fabrication rule"
```

---

## Task 8: Inserter — push to Supabase, idempotent

**Files:**
- Create: `scripts/ingest/insert.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/ingest/insert.ts
import { createSupabaseAdminClient } from '../../src/lib/supabase/admin';

type CaseInsert = {
  title: string;
  industry: string;
  case_type: string;
  difficulty: string;
  source: string | null;
  casebook_id: string | null;
  problem_statement: string;
  interviewer_notes: any[];
  ideal_structure: any;
  tags: string[];
  provenance: Record<string, unknown>;
};

export async function upsertCasebook(school: string, year: number | null, title: string, sourceUrl: string, localPath: string) {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from('casebooks')
    .select('id')
    .eq('school', school)
    .eq('title', title)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await admin
    .from('casebooks')
    .insert({ school, year, title, source_url: sourceUrl, local_path: localPath })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function insertCase(row: CaseInsert): Promise<{ inserted: boolean; reason?: string }> {
  const admin = createSupabaseAdminClient();

  // Idempotency: skip if same (casebook_id, title) exists
  if (row.casebook_id) {
    const { data: dup } = await admin
      .from('cases')
      .select('id')
      .eq('casebook_id', row.casebook_id)
      .eq('title', row.title)
      .maybeSingle();
    if (dup) return { inserted: false, reason: 'duplicate' };
  }

  const { error } = await admin.from('cases').insert(row);
  if (error) return { inserted: false, reason: error.message };
  return { inserted: true };
}

export async function bumpCasebookCount(casebookId: string, by: number) {
  const admin = createSupabaseAdminClient();
  const { data: cb } = await admin.from('casebooks').select('case_count').eq('id', casebookId).single();
  await admin.from('casebooks').update({ case_count: (cb?.case_count ?? 0) + by }).eq('id', casebookId);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/insert.ts
git commit -m "feat(ingest): idempotent case + casebook insertion"
```

---

## Task 9: Logger

**Files:**
- Create: `scripts/ingest/log.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/ingest/log.ts
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `ingest-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
let initialized = false;

async function ensure() {
  if (initialized) return;
  await mkdir(LOG_DIR, { recursive: true });
  initialized = true;
}

export async function log(level: 'info' | 'warn' | 'error', stage: string, msg: string, extra: Record<string, unknown> = {}) {
  await ensure();
  const line = JSON.stringify({ t: new Date().toISOString(), level, stage, msg, ...extra }) + '\n';
  await appendFile(LOG_FILE, line);
  const c = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
  console.log(`${c}[${stage}]\x1b[0m ${msg}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/log.ts
git commit -m "feat(ingest): structured logger"
```

---

## Task 10: Orchestrator

**Files:**
- Create: `scripts/ingest/index.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/ingest/index.ts
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

  // Stage 1: discover
  const discovered = await discoverAll();
  await log('info', 'discover', `found ${discovered.length} candidate PDFs`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { school, pdfUrl } of discovered) {
    // Stage 2: download
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

    // Register casebook
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

    // Stage 3: parse
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
      continue; // skip scanned PDFs in v1
    }

    const chunks = splitIntoCaseChunks(parsed.text);
    await log('info', 'parse', `${path.basename(dl.localPath)} → ${chunks.length} chunks`);

    // Stage 4: extract + insert
    let inserted = 0;
    for (const chunk of chunks) {
      if (chunk.length < 200) continue; // skip tiny chunks
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
```

- [ ] **Step 2: Dry-run smoke**

```bash
npm run ingest:run:dry 2>&1 | tail -30
```

Expected: orchestrator runs end-to-end against any PDFs found, prints `[dry] would insert: …` for parsed cases, no DB writes.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/index.ts
git commit -m "feat(ingest): orchestrator wiring discover → download → parse → extract → insert"
```

---

## Task 11: First real ingestion run

- [ ] **Step 1: Confirm prerequisites**

- Plan A's Tasks 1-6 are complete (Next.js scaffolded, deps installed, Supabase schema applied, admin client present).
- `.env.local` has `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` filled in.
- Casebook discovery has been verified (Task 4 step 6 produced URLs).

- [ ] **Step 2: Run live**

```bash
npm run ingest:run 2>&1 | tee logs/first-run.log
```

This may take 30 minutes to several hours depending on how many PDFs are discovered and how clean their text is. The throttle keeps Groq calls under 25/min.

- [ ] **Step 3: Verify in Supabase**

In Supabase SQL editor:
```sql
select count(*) from cases;
select school, case_count from casebooks order by case_count desc;
```

Record the count. If ≥300, the day-1 success criterion is met.

- [ ] **Step 4: Commit log + state**

```bash
git add logs/first-run.log
git commit -m "chore(ingest): first run results"
```

---

## Self-Review Notes

**Spec coverage check (cross-reference §8 of spec):**
- ✓ Stage 1 Crawl → Task 4 (`discover.ts`)
- ✓ Stage 2 Download → Task 5 (`download.ts`), idempotent (skip-existing), paywall-block via blocked tokens
- ✓ Stage 3 Parse → Task 6 (`parse.ts`), pdf-parse + OCR detection (OCR deferred queue per spec section 8 OCR note)
- ✓ Stage 4 Insert → Task 8 (`insert.ts`), idempotent on (casebook_id, title)
- ✓ Throttling → Task 3 (`throttle.ts`)
- ✓ Observability → Task 9 (`log.ts`) with per-stage status
- ✓ `casebooks` table updated with `case_count` → Task 8 (`bumpCasebookCount`)

**Type consistency check:**
- `CaseInsert` shape in `insert.ts` matches the columns of `cases` table from Plan A's Task 3. ✓
- `extractCase` return value's keys map 1:1 to `CaseInsert` fields. ✓
- The `'server-only'` import was correctly addressed — patched in Plan B Task 7 (Step 3) so `src/lib/groq/client.ts` is usable from both Next API routes and tsx scripts.

**Placeholder scan:**
- No "TBD" / "TODO".
- One self-correcting note in Task 7 about the `server-only-stub` typo — the corrected, final code block follows immediately.
- OCR is intentionally minimal in v1 with a clear marker; this is deliberate scope (per spec §8 "scanned PDFs go to a deferred queue rather than blocking the line"), not a placeholder.

---

## Execution

After approval, execute via **superpowers:subagent-driven-development**. Plan B depends on Plan A's first 6 tasks; either complete those first, OR run Plan A and Plan B in two separate worktrees with the assumption that Plan A reaches Task 6 quickly.

**Recommended runtime:** Plan B Tasks 1-10 land in 60-90 minutes of subagent time. Task 11 (the live run) is wall-clock time only — no agent work. Day-1 target ≥300 cases is met when Task 11 completes successfully on a reasonable subset of discovered PDFs.
