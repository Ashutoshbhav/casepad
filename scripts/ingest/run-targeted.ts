// Targeted second-pass — processes only PDFs matching a glob pattern.
// Uses the multi-provider llm-router (Groq → NVIDIA fallback) so it can run
// in parallel with the main Phase-4 second-pass without colliding on NVIDIA's
// rate limits.
//
// Usage: tsx run-targeted.ts <pattern> [pattern2 ...]
//   tsx run-targeted.ts 'ash2-*.pdf' 'comp-*.pdf'

import { parsePdfFile } from './parse';
import { slabify } from './extract-multi';
import { upsertCasebook, insertCase, bumpCasebookCount } from './insert';
import { Throttle } from './throttle';
import { log } from './log';
import path from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { pathToFileURL } from 'url';
import { completeChat } from '../../src/lib/llm-router';

const llmThrottle = new Throttle(20, 60_000);
const CONCURRENCY = Number(process.env.INGEST_CONCURRENCY) || 3;
const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');

async function targets(patterns: string[]): Promise<{ school: string; localPath: string; pdfUrl: string }[]> {
  let entries: string[];
  try { entries = await readdir(RAW_DIR); } catch { return []; }
  const out: { school: string; localPath: string; pdfUrl: string }[] = [];
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.pdf')) continue;
    const matches = patterns.some((p) => {
      const re = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
      return re.test(name);
    });
    if (!matches) continue;
    const localPath = path.join(RAW_DIR, name);
    const sepIdx = name.indexOf('__');
    const school = sepIdx > 0 ? name.slice(0, sepIdx) : 'manual';
    out.push({ school, localPath, pdfUrl: pathToFileURL(localPath).href });
  }
  return out;
}

async function extractMultiWithRouter(slab: string): Promise<any[]> {
  const system = `You read consulting casebook text and extract EVERY distinct case study you find as JSON.

Output JSON only with this exact schema:
{
  "cases": [
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
  ]
}

ZERO-MISS RULE: extract every business scenario you can find. Skip ONLY blank pages, certificates, legal disclaimers, raw TOC. trigger_keywords: 3-6 noun phrases per note. If a case appears partially cut off, skip (next overlapping slab will catch).`;

  const user = `CASEBOOK TEXT:\n\n${slab}\n\nReturn JSON only.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await completeChat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 6000,
        temperature: 0.1,
        json: true,
      });
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed?.cases) ? parsed.cases : [];
      } catch { return []; }
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  return [];
}

async function main() {
  const patterns = process.argv.slice(2);
  if (patterns.length === 0) {
    console.error('Usage: tsx run-targeted.ts <glob1> [glob2 ...]');
    process.exit(1);
  }
  await log('info', 'targeted', `start patterns=${patterns.join(',')} CONCURRENCY=${CONCURRENCY}`);
  const list = await targets(patterns);
  await log('info', 'targeted', `${list.length} matched files`);

  let totalInserted = 0;

  for (const t of list) {
    const fname = path.basename(t.localPath);
    let textBlob: string;
    try {
      const parsed = await parsePdfFile(t.localPath);
      textBlob = parsed.text;
    } catch (e) {
      await log('error', 'targeted', `parse fail ${fname}: ${(e as Error).message.slice(0, 200)}`);
      continue;
    }
    if (textBlob.length < 1000) {
      await log('info', 'targeted', `skip ${fname} (text too short)`);
      continue;
    }

    const slabs = slabify(textBlob);
    await log('info', 'targeted', `${fname} → ${slabs.length} slabs (${(textBlob.length / 1000).toFixed(0)}kc)`);

    const casebookId = await upsertCasebook(t.school, null, fname.replace(/\.pdf$/, ''), t.pdfUrl, t.localPath);

    let bookInserted = 0;
    let next = 0;

    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= slabs.length) return;
        await llmThrottle.acquire();
        let cases: any[] = [];
        try {
          cases = await extractMultiWithRouter(slabs[i]);
        } catch (e) {
          await log('warn', 'targeted', `slab ${i} of ${fname} failed: ${(e as Error).message.slice(0, 200)}`);
          continue;
        }
        for (const c of cases) {
          if (!c?.title || !c?.problem_statement) continue;
          const r = await insertCase({
            title: c.title,
            industry: c.industry || 'other',
            case_type: c.case_type || 'other',
            difficulty: c.difficulty || 'medium',
            source: c.source ?? t.school,
            casebook_id: casebookId,
            problem_statement: c.problem_statement,
            interviewer_notes: c.interviewer_notes ?? [],
            ideal_structure: c.ideal_structure ?? {},
            tags: c.tags ?? [],
            provenance: { school: t.school, casebook_title: fname, source_url: t.pdfUrl, pass: 'targeted' },
          });
          if (r.inserted) bookInserted++;
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    if (bookInserted > 0) await bumpCasebookCount(casebookId, bookInserted);
    await log('info', 'targeted', `${fname} → ${bookInserted} inserted`);
    totalInserted += bookInserted;
  }

  await log('info', 'targeted', `done. inserted=${totalInserted}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
