// scripts/qa/enrich-case-dossiers.ts
//
// Stream 4 of AI training plan (2026-05-08). Enriches each case with a
// pre-computed knowledge dossier injected into the chat system prompt at
// session start so the AI has deep per-case grounding.
//
// Usage:
//   # Apply migration first via Supabase Studio:
//   #   supabase/migrations/0012_dossier.sql
//   #
//   # Then enrich:
//   npx tsx --env-file=.env.local scripts/qa/enrich-case-dossiers.ts \
//     [--limit=10] [--starter] [--force] [--ids=id1,id2,...]
//
// Per docs/research/PER-CASE-KNOWLEDGE-DEPTH.md:
//   - Pattern A (case dossier) = highest ROI for closing question buckets
//     b/c/d ("what's typical margin?", "who else is in this market?",
//     "real-world numbers")
//   - Schema follows Khanmigo's per-content metadata pattern
//   - Cost: ~97 min total on Groq free tier for 1,165 cases ($0)

import { createClient } from '@supabase/supabase-js';
import { completeChat } from '../../src/lib/llm-router';
import { STARTER_CASE_IDS } from '../../src/lib/starter-cases';

const SCHEMA_VERSION = '1.0.0';

const SYSTEM_PROMPT = `You are an expert case-interview content engineer. Given a B-school case (title, problem statement, framework, reveal data), produce a structured KNOWLEDGE DOSSIER that an AI interviewer can use to answer ANY candidate question deeply, not just questions covered by the casebook reveals.

Output ONLY valid JSON in this exact schema:
{
  "schema_version": "1.0.0",
  "industry_primer": string (3-5 sentences on the industry context — competitive structure, key economics, regulatory backdrop, typical customer behavior),
  "real_world_numbers": [
    {"metric": string, "value": string, "source_hint": string}
  ] (8-15 verifiable real-world numbers — typical margins, market sizes, competitor counts, customer LTVs — with source hints like "industry reports" or "company filings"),
  "expected_math": [
    {"step": string, "formula": string, "typical_answer_range": string}
  ] (4-8 calculation steps a strong candidate is expected to perform, with formula and reasonable range),
  "common_mistakes": [string] (5-8 specific things weak candidates do on this case — common errors, oversights, sloppy assumptions),
  "anticipated_questions": [
    {"q": string, "a": string, "category": "industry" | "competitive" | "math" | "framework" | "real-world"}
  ] (15-25 questions a candidate might ask + grounded answers — written as if Ash is answering),
  "framework_hints": [string] (3-5 specific framework angles tailored to this case — not generic 4Ps),
  "sources": [string] (3-5 source hints for further research — e.g., "Statista industry reports", "company 10-K filings"),
  "case_type_notes": string (1-2 sentences on what makes this case_type challenging in this specific case)
}

Rules:
- EVERY claim should be groundable in real-world data (don't invent specific company names unless they're public)
- "anticipated_questions" should cover questions the casebook does NOT answer — that's the whole point of this dossier
- Numbers should be ranges, not point estimates ("typical margin: 8-12%" not "10%")
- Tone: factual, specific, no fluff
- Indian-context where applicable (the cohort is IIM A/B/C / SSB)`;

interface CaseRow {
  id: string;
  title: string;
  problem_statement: string;
  case_type: string | null;
  ideal_structure: any;
  interviewer_notes: any[] | null;
  industry: string | null;
  dossier: any | null;
}

async function enrichOne(c: CaseRow): Promise<{ ok: boolean; dossier?: any; error?: string }> {
  const userPrompt = `CASE TITLE: ${c.title}

PROBLEM STATEMENT:
${c.problem_statement}

CASE TYPE: ${c.case_type || 'unknown'}
INDUSTRY: ${c.industry || 'unknown'}

IDEAL STRUCTURE (from casebook):
${JSON.stringify(c.ideal_structure || {}, null, 2)}

REVEAL DATA (gated facts the AI uncovers when asked):
${JSON.stringify((c.interviewer_notes || []).slice(0, 8), null, 2)}

Produce the knowledge dossier JSON now. Remember: anticipated_questions must cover what the casebook DOES NOT — industry context, real-world benchmarks, common pitfalls beyond the case data.`;

  try {
    const raw = await completeChat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      json: true,
      temperature: 0.3,
      max_tokens: 4000,
    });
    const parsed = JSON.parse(raw || '{}');
    if (!parsed.industry_primer || !parsed.anticipated_questions) {
      return { ok: false, error: 'incomplete dossier shape' };
    }
    parsed.schema_version = SCHEMA_VERSION;
    parsed.enriched_at = new Date().toISOString();
    return { ok: true, dossier: parsed };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 200) };
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Parse args
  const args = process.argv.slice(2);
  const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '10', 10);
  const starter = args.includes('--starter');
  const force = args.includes('--force');
  const ids = args.find((a) => a.startsWith('--ids='))?.split('=')[1]?.split(',') ?? [];

  // Decide which cases to enrich
  let query = supabase
    .from('cases')
    .select('id, title, problem_statement, case_type, ideal_structure, interviewer_notes, industry, dossier');
  if (starter) {
    query = query.in('id', STARTER_CASE_IDS);
  } else if (ids.length > 0) {
    query = query.in('id', ids);
  } else {
    query = query.limit(limit);
  }
  if (!force) {
    // Skip cases that already have a dossier with the current schema_version
    // (we'll filter client-side since Supabase doesn't expose JSONB->>'x' WHERE on REST without RPC).
  }

  const { data: cases, error } = await query;
  if (error || !cases) {
    console.error('Failed to fetch cases:', error);
    process.exit(1);
  }

  const todo = cases.filter((c: any) => {
    if (force) return true;
    if (!c.dossier) return true;
    return c.dossier.schema_version !== SCHEMA_VERSION;
  });

  console.log(`[enrich] ${todo.length} cases to enrich (skipping ${cases.length - todo.length} already up-to-date)`);

  let success = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const c = todo[i];
    const startMs = Date.now();
    process.stdout.write(`[${i + 1}/${todo.length}] ${c.title.slice(0, 50).padEnd(50)} `);
    const r = await enrichOne(c);
    if (r.ok) {
      const { error: writeErr } = await supabase
        .from('cases')
        .update({ dossier: r.dossier })
        .eq('id', c.id);
      if (writeErr) {
        console.log(`✗ DB write failed: ${writeErr.message}`);
        failed++;
      } else {
        const dur = Date.now() - startMs;
        console.log(`✓ enriched in ${(dur / 1000).toFixed(1)}s`);
        success++;
      }
    } else {
      console.log(`✗ ${r.error}`);
      failed++;
    }
  }

  console.log(`\n[enrich] DONE: ${success} succeeded, ${failed} failed (out of ${todo.length})`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[enrich] FATAL:', err);
  process.exit(1);
});
