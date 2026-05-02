// Smart Phase 4 — second-pass on remaining low-yield books, BUT bails on a
// book if first 2 slabs produce 0 cases (probably a financial report, not a
// casebook). Recovers genuine cases without grinding LLM time on annual reports.

import { parsePdfFile } from './parse';
import { slabify } from './extract-multi';
import { upsertCasebook, insertCase, bumpCasebookCount } from './insert';
import { Throttle } from './throttle';
import { log } from './log';
import path from 'path';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import { completeChat } from '../../src/lib/llm-router';

const llmThrottle = new Throttle(20, 60_000);
const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');

const SYSTEM = `You read consulting casebook text and extract EVERY distinct case study you find as JSON.

Output JSON only:
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

Skip ONLY: blank pages, certificates, legal disclaimers, raw TOC, financial reports / annual reports / earnings releases. Extract every business scenario with a problem to solve.`;

async function extract(slab: string): Promise<any[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await completeChat({
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `CASEBOOK TEXT:\n\n${slab}\n\nReturn JSON only.` },
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
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return [];
}

async function main() {
  await log('info', 'smart-p4', 'start');
  const entries = await readdir(RAW_DIR);
  const files = entries.filter((f) => f.toLowerCase().endsWith('.pdf'));
  let totalInserted = 0;
  let totalBailed = 0;

  for (const fname of files) {
    const full = path.join(RAW_DIR, fname);
    const sepIdx = fname.indexOf('__');
    const school = sepIdx > 0 ? fname.slice(0, sepIdx) : 'manual';
    let parsed;
    try { parsed = await parsePdfFile(full); }
    catch (e) { await log('warn', 'smart-p4', `skip ${fname} (parse fail)`); continue; }
    if (parsed.text.length < 1000) continue;

    const slabs = slabify(parsed.text);
    if (slabs.length === 0) continue;

    const casebookId = await upsertCasebook(school, null, fname.replace(/\.pdf$/, ''), pathToFileURL(full).href, full);
    let bookInserted = 0;

    // Probe first 2 slabs sequentially. If both produce 0 cases, BAIL.
    let probeResult = 0;
    for (let i = 0; i < Math.min(2, slabs.length); i++) {
      await llmThrottle.acquire();
      let cases: any[] = [];
      try { cases = await extract(slabs[i]); }
      catch (e) { await log('warn', 'smart-p4', `${fname} slab ${i} failed: ${(e as Error).message.slice(0,150)}`); continue; }
      for (const c of cases) {
        if (!c?.title || !c?.problem_statement) continue;
        const r = await insertCase({
          title: c.title,
          industry: c.industry || 'other',
          case_type: c.case_type || 'other',
          difficulty: c.difficulty || 'medium',
          source: c.source ?? school,
          casebook_id: casebookId,
          problem_statement: c.problem_statement,
          interviewer_notes: c.interviewer_notes ?? [],
          ideal_structure: c.ideal_structure ?? {},
          tags: c.tags ?? [],
          provenance: { school, casebook_title: fname, source_url: pathToFileURL(full).href, pass: 'smart' },
        });
        if (r.inserted) { bookInserted++; probeResult++; }
      }
    }

    if (probeResult === 0 && slabs.length > 2) {
      await log('info', 'smart-p4', `BAIL ${fname} (0 cases from first 2 of ${slabs.length} slabs — likely not a casebook)`);
      totalBailed++;
      continue;
    }

    // Continue with remaining slabs at concurrency 3
    const queue = slabs.slice(2);
    let next = 0;
    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= queue.length) return;
        await llmThrottle.acquire();
        let cases: any[] = [];
        try { cases = await extract(queue[i]); } catch { continue; }
        for (const c of cases) {
          if (!c?.title || !c?.problem_statement) continue;
          const r = await insertCase({
            title: c.title,
            industry: c.industry || 'other',
            case_type: c.case_type || 'other',
            difficulty: c.difficulty || 'medium',
            source: c.source ?? school,
            casebook_id: casebookId,
            problem_statement: c.problem_statement,
            interviewer_notes: c.interviewer_notes ?? [],
            ideal_structure: c.ideal_structure ?? {},
            tags: c.tags ?? [],
            provenance: { school, casebook_title: fname, source_url: pathToFileURL(full).href, pass: 'smart' },
          });
          if (r.inserted) bookInserted++;
        }
      }
    };
    await Promise.all(Array.from({ length: 3 }, () => worker()));

    if (bookInserted > 0) await bumpCasebookCount(casebookId, bookInserted);
    await log('info', 'smart-p4', `${fname} → ${bookInserted} inserted`);
    totalInserted += bookInserted;
  }

  await log('info', 'smart-p4', `done. inserted=${totalInserted} bailed=${totalBailed}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
