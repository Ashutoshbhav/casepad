// Pre-generate pre_case_crammer + ideal_walkthrough for the 10 hand-curated
// starter cases. Run once after a fresh DB or when the starter set changes.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/pregen-starter-content.ts
//   npx tsx --env-file=.env.local scripts/qa/pregen-starter-content.ts --provider=nvidia
//
// Idempotent: skips cases whose pre_case_crammer / ideal_walkthrough is
// already non-null. Sequential (1 case at a time, 1s sleep) to be polite to
// rate limits. Per-case errors are logged and skipped — never aborts.
//
// Why this script doesn't import src/lib/groq/* directly:
//   - The shared groq client uses the official groq-sdk, which posts to
//     `/openai/v1/chat/completions`. That works for Groq's host but fails on
//     NVIDIA NIM (which expects `/v1/chat/completions`). For this batch job
//     we want NVIDIA NIM as a viable fallback when Groq daily TPD is hit, so
//     we inline a minimal OpenAI-compatible chat client and re-implement the
//     two prompts (kept verbatim from src/lib/groq/{pre-case-crammer, walkthrough}.ts).

import { createClient } from '@supabase/supabase-js';
import { STARTER_CASE_IDS } from '../../src/lib/starter-cases';
import { TRACKS, type Track } from '../../src/lib/tracks';
import { researchCase } from '../../src/lib/research/tavily';

// ----- Provider config -----
type ProviderName = 'groq' | 'nvidia';
const provider: ProviderName = process.argv.includes('--provider=nvidia') ? 'nvidia' : 'groq';

interface ProviderCfg {
  name: ProviderName;
  url: string;
  apiKey: string;
  model: string;
}

function getProviderCfg(p: ProviderName): ProviderCfg {
  if (p === 'nvidia') {
    return {
      name: 'nvidia',
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: process.env.NVIDIA_API_KEY || '',
      model: 'meta/llama-3.3-70b-instruct',
    };
  }
  return {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: process.env.GROQ_API_KEY || '',
    model: 'llama-3.3-70b-versatile',
  };
}

interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOpts {
  temperature?: number;
  max_tokens?: number;
  responseJson?: boolean;
}

// Minimal OpenAI-compatible chat client. Manual fetch so we don't go through
// the groq-sdk path (which doesn't work for NVIDIA NIM — it always POSTs to
// `/openai/v1/chat/completions`).
async function chatComplete(
  cfg: ProviderCfg,
  messages: ChatMsg[],
  opts: ChatOpts = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 2000,
  };
  if (opts.responseJson) body.response_format = { type: 'json_object' };

  // Retry with backoff on 429 + transient errors.
  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        const err = new Error(`${cfg.name} ${r.status}: ${txt.slice(0, 300)}`);
        (err as any).status = r.status;
        if (r.status === 429 && attempt < 2) {
          await new Promise((s) => setTimeout(s, 5000 * (attempt + 1)));
          lastErr = err;
          continue;
        }
        throw err;
      }
      const data: any = await r.json();
      return data.choices?.[0]?.message?.content || '{}';
    } catch (err: any) {
      lastErr = err;
      if (attempt < 2 && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
        await new Promise((s) => setTimeout(s, 2000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error('chat completion failed after retries');
}

// ----- Prompt builders (mirror src/lib/groq/*.ts) -----

interface PreCaseCrammer {
  industry_primer: {
    sector: string;
    typical_margins: string;
    key_kpis: string[];
    recent_disruption: string;
    top_players: string[];
  };
  likely_frameworks: { name: string; why_this_one: string }[];
  math_shortcuts: { name: string; formula: string; when: string }[];
  watch_outs: string[];
  recovery_script: string;
  spike_phrase: string;
  sources: { title: string; url: string }[];
}

async function generateCrammer(
  cfg: ProviderCfg,
  caseTitle: string,
  problemStatement: string,
  track: Track,
  weakestDimensions: string[]
): Promise<PreCaseCrammer | null> {
  const def = TRACKS[track];

  let research = '';
  let sources: { title: string; url: string }[] = [];
  try {
    const r = await researchCase(caseTitle, problemStatement);
    research = r.research;
    sources = r.sources;
  } catch (err) {
    console.warn('  crammer research skipped:', (err as Error).message);
  }

  const trackFrameworks = def.frameworks.map((f) => `${f.name} — ${f.when_to_use}`).join('\n');
  const trackMath = def.math.map((m) => `${m.name}: ${m.formula}`).join('\n');

  const system = `You generate a 30-second pre-case cheat sheet for a ${def.label} candidate about to solve a case.

Output JSON only:
{
  "industry_primer": {
    "sector": string,
    "typical_margins": string,
    "key_kpis": [string],
    "recent_disruption": string,
    "top_players": [string]
  },
  "likely_frameworks": [{"name": string, "why_this_one": string}],
  "math_shortcuts": [{"name": string, "formula": string, "when": string}],
  "watch_outs": [string],
  "recovery_script": string,
  "spike_phrase": string,
  "sources": []
}

Rules:
- industry_primer: drawn from the WEB RESEARCH below. Specific numbers/companies, not generic. If web research is empty/missing, use sector-typical ranges and explicitly say "(typical range — verify in case)" for any number.
- likely_frameworks: 2-3 from the candidate's track frameworks (listed below). Pick based on the case's actual content. why_this_one must reference the case in 1 sentence — NOT a generic framework summary.
- math_shortcuts: 3-5 from the track math list. Pick what THIS case will need; prioritize what the candidate's weak dimensions ${weakestDimensions.join(', ') || '(no history)'} suggests they'd struggle with.
- watch_outs: 2-3 specific things to remember. INCLUDE one that maps to the user's weakest dimensions. Avoid generic "remember to be MECE" — these are useless.
- recovery_script: pick one of the track's recovery scripts most relevant to this case.
- spike_phrase: one of the track's killer phrases that'd be impressive in this case — must be quoteable verbatim.
- DO NOT invent industry numbers. If unsure, omit or say "verify in case data".
- Output must be readable in 30 seconds. Cut anything that's not action-oriented.

TRACK FRAMEWORKS AVAILABLE:
${trackFrameworks}

TRACK MATH AVAILABLE:
${trackMath}

TRACK RECOVERY SCRIPTS:
${def.recovery_scripts.join('\n')}

TRACK KILLER PHRASES:
${def.killer_phrases.join('\n')}`;

  const user = `CASE TITLE: ${caseTitle}

PROBLEM STATEMENT:
${problemStatement}

CANDIDATE'S WEAKEST DIMENSIONS (last 10 cases): ${weakestDimensions.join(', ') || '(no history yet)'}

WEB RESEARCH (use for industry_primer):
${research || '(no research available)'}

Generate the pre-case crammer JSON.`;

  const content = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.2, max_tokens: 1800, responseJson: true }
  );

  const parsed = parseJsonRobust(content) as PreCaseCrammer;
  if (!parsed) return null;
  parsed.sources = sources;
  return parsed;
}

interface IdealWalkthrough {
  issue_tree: { root_question: string; branches: { node: string; subnodes: string[] }[] };
  hypothesis_tree: { primary: string; supporting: string[] };
  thinking_levels: {
    L0_recommendation: string;
    L1_drivers: string[];
    L2_evidence: string[];
    L3_risks: string[];
    L4_implementation: string[];
  };
  step_by_step: { step: number; action: string; reasoning: string; expected_questions?: string[] }[];
  sources?: { title: string; url: string }[];
}

async function generateWalkthrough(
  cfg: ProviderCfg,
  title: string,
  problemStatement: string,
  idealStructure: any,
  interviewerNotes: any[]
): Promise<IdealWalkthrough | null> {
  let research = '';
  let sources: { title: string; url: string }[] = [];
  try {
    const r = await researchCase(title, problemStatement);
    research = r.research;
    sources = r.sources;
  } catch (err) {
    console.warn('  walkthrough research skipped:', (err as Error).message);
  }

  const system = `You are a senior consulting interview coach. Given a case, produce
the IDEAL step-by-step solve that a top-percentile MBB candidate would deliver.

Output JSON only with this exact schema:
{
  "issue_tree": {
    "root_question": string,
    "branches": [{"node": string, "subnodes": [string]}]
  },
  "hypothesis_tree": {
    "primary": string,
    "supporting": [string]
  },
  "thinking_levels": {
    "L0_recommendation": string,
    "L1_drivers": [string],
    "L2_evidence": [string],
    "L3_risks": [string],
    "L4_implementation": [string]
  },
  "step_by_step": [{"step": number, "action": string, "reasoning": string, "expected_questions": [string]}]
}

Rules:
- issue_tree decomposes the root question into MECE branches with concrete subnodes.
- hypothesis_tree.primary is the candidate's initial hypothesis (one sentence). supporting are 2-4 sub-hypotheses to test.
- Thinking levels go from coarse to fine:
  - L0: one-sentence final recommendation
  - L1: 3-5 top-level drivers
  - L2: specific data points / evidence the case provides
  - L3: 2-4 risks or counter-arguments
  - L4: 2-4 implementation/next-step considerations
- step_by_step has 5-8 steps showing what a strong candidate says at each stage (clarify → decompose → hypothesize → test → recommend).
- ANTI-SLOP RULE: every L2 evidence point and every step's reasoning MUST reference EITHER (a) a specific number/fact from the case data (problem/structure/reveals) OR (b) a specific finding from the WEB RESEARCH below. Generic MBB-cliche statements ("evaluate market attractiveness") without grounding are FORBIDDEN.
- If the web research contradicts the case's premises, prefer the case data — but USE the web research to add real industry numbers, competitor names, and recent context.
- Output must read like it was written by someone who actually researched this company, not someone reciting frameworks.

EDGE CASES:
- If problem statement is too vague (<60 chars or no concrete ask), make the issue tree GENERIC for the implied case type but flag in step 1: "first I'd clarify [specific clarifying question]".
- If the case is a market-sizing / estimation, replace the recommendation step with a numerical answer + range.
- If interviewer notes have a clear "spike" data point (a surprising number), CALL IT OUT in L2 evidence as the key insight.
- For behavioral / fit cases (no business problem), produce a STAR-style breakdown instead of issue tree.
- Never use the words "MECE", "low-hanging fruit", "synergy" without surrounding specificity — these are red-flag cliches when ungrounded.`;

  const user = `CASE TITLE: ${title}

PROBLEM STATEMENT:
${problemStatement}

IDEAL STRUCTURE (from casebook):
${JSON.stringify(idealStructure, null, 2)}

INTERVIEWER REVEAL DATA (what gets uncovered when asked):
${JSON.stringify((interviewerNotes || []).slice(0, 8), null, 2)}

WEB RESEARCH (real-world context to ground your walkthrough in):
${research || '(no research available — ground in case data only)'}

Generate the ideal walkthrough JSON. Remember: every evidence/reasoning point MUST cite either case data or web research — no MBB-cliche generics.`;

  const content = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.2, max_tokens: 2500, responseJson: true }
  );

  const parsed = parseJsonRobust(content) as IdealWalkthrough;
  if (!parsed) return null;
  if (sources.length > 0) parsed.sources = sources;
  return parsed;
}

// Some providers (NVIDIA NIM with `response_format: json_object`) sometimes
// emit pre/post wrapping. Strip code fences and find the outer JSON object.
function parseJsonRobust(s: string): any {
  if (!s) return null;
  let txt = s.trim();
  // Strip ```json ... ``` fences
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  try {
    return JSON.parse(txt);
  } catch {}
  // Find first '{' and matching last '}'
  const start = txt.indexOf('{');
  const end = txt.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(txt.slice(start, end + 1));
    } catch {}
  }
  return null;
}

// ----- Main -----

interface Outcome {
  id: string;
  title: string;
  crammer_status: 'generated' | 'cached' | 'failed' | 'skipped';
  walkthrough_status: 'generated' | 'cached' | 'failed' | 'skipped';
  errors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  const cfg = getProviderCfg(provider);
  if (!cfg.apiKey) {
    console.error(`Missing API key for provider=${cfg.name}`);
    process.exit(1);
  }

  console.log(`[pregen] Provider: ${cfg.name} | Model: ${cfg.model}`);
  console.log(`[pregen] Endpoint: ${cfg.url}`);
  console.log(`[pregen] Supabase: ${SUPABASE_URL}`);
  console.log(`[pregen] Cases: ${STARTER_CASE_IDS.length}`);
  console.log('');

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startTime = Date.now();
  const outcomes: Outcome[] = [];

  for (let i = 0; i < STARTER_CASE_IDS.length; i++) {
    const caseId = STARTER_CASE_IDS[i];
    const idx = `[${i + 1}/${STARTER_CASE_IDS.length}]`;
    console.log(`${idx} ${caseId} — fetching…`);

    const { data: caseRow, error: fetchErr } = await supa
      .from('cases')
      .select('id, title, problem_statement, tracks, ideal_structure, interviewer_notes, pre_case_crammer, ideal_walkthrough')
      .eq('id', caseId)
      .single();

    if (fetchErr || !caseRow) {
      console.error(`${idx} FAIL: case row not found — ${fetchErr?.message || 'no row'}`);
      outcomes.push({
        id: caseId,
        title: '(not found)',
        crammer_status: 'failed',
        walkthrough_status: 'failed',
        errors: [`row fetch: ${fetchErr?.message || 'no row'}`],
      });
      continue;
    }

    const title: string = caseRow.title;
    const problem: string = caseRow.problem_statement || '';
    const tracksArr = (caseRow.tracks as string[] | null) || [];
    const track: Track = (tracksArr[0] as Track) || 'consulting';
    const errors: string[] = [];

    console.log(`${idx} title: ${title.slice(0, 70)}`);
    console.log(`${idx} track: ${track}, problem len: ${problem.length}`);

    let crammer_status: Outcome['crammer_status'] = 'skipped';
    let walkthrough_status: Outcome['walkthrough_status'] = 'skipped';

    // -------- pre_case_crammer --------
    if (caseRow.pre_case_crammer) {
      console.log(`${idx} crammer: already cached, skipping`);
      crammer_status = 'cached';
    } else {
      try {
        console.log(`${idx} crammer: generating…`);
        const crammer = await generateCrammer(cfg, title, problem, track, []);
        if (crammer) {
          const { error: upErr } = await supa
            .from('cases')
            .update({ pre_case_crammer: crammer })
            .eq('id', caseId);
          if (upErr) {
            errors.push(`crammer update: ${upErr.message}`);
            crammer_status = 'failed';
            console.error(`${idx} crammer: DB update failed — ${upErr.message}`);
          } else {
            crammer_status = 'generated';
            console.log(`${idx} crammer: saved (sector="${crammer.industry_primer?.sector?.slice(0, 60) ?? ''}")`);
          }
        } else {
          errors.push('crammer: parse returned null');
          crammer_status = 'failed';
          console.error(`${idx} crammer: parse returned null`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`crammer: ${msg.slice(0, 250)}`);
        crammer_status = 'failed';
        console.error(`${idx} crammer: threw — ${msg.slice(0, 250)}`);
      }
    }

    // -------- ideal_walkthrough --------
    if (caseRow.ideal_walkthrough) {
      console.log(`${idx} walkthrough: already cached, skipping`);
      walkthrough_status = 'cached';
    } else {
      try {
        console.log(`${idx} walkthrough: generating…`);
        const walkthrough = await generateWalkthrough(
          cfg,
          title,
          problem,
          caseRow.ideal_structure || {},
          (caseRow.interviewer_notes as any[]) || []
        );
        if (walkthrough) {
          const { error: upErr } = await supa
            .from('cases')
            .update({ ideal_walkthrough: walkthrough })
            .eq('id', caseId);
          if (upErr) {
            errors.push(`walkthrough update: ${upErr.message}`);
            walkthrough_status = 'failed';
            console.error(`${idx} walkthrough: DB update failed — ${upErr.message}`);
          } else {
            walkthrough_status = 'generated';
            const steps = walkthrough.step_by_step?.length ?? 0;
            console.log(`${idx} walkthrough: saved (${steps} steps)`);
          }
        } else {
          errors.push('walkthrough: parse returned null');
          walkthrough_status = 'failed';
          console.error(`${idx} walkthrough: parse returned null`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`walkthrough: ${msg.slice(0, 250)}`);
        walkthrough_status = 'failed';
        console.error(`${idx} walkthrough: threw — ${msg.slice(0, 250)}`);
      }
    }

    outcomes.push({ id: caseId, title, crammer_status, walkthrough_status, errors });

    if (i < STARTER_CASE_IDS.length - 1) {
      await sleep(1000);
    }
  }

  // ----- Summary -----
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========== SUMMARY ==========');
  console.log(`Total wall-clock: ${elapsedSec}s`);
  for (const o of outcomes) {
    console.log(`- ${o.id} | crammer=${o.crammer_status} walkthrough=${o.walkthrough_status} | ${o.title.slice(0, 60)}`);
    for (const e of o.errors) console.log(`    err: ${e}`);
  }

  // ----- Verification -----
  console.log('\n========== VERIFICATION ==========');
  const { data: verify, error: vErr } = await supa
    .from('cases')
    .select('id, title, pre_case_crammer, ideal_walkthrough')
    .in('id', STARTER_CASE_IDS);

  if (vErr) {
    console.error('Verification query failed:', vErr.message);
  } else if (verify) {
    const crammerNonNull = verify.filter((r: any) => r.pre_case_crammer != null).length;
    const walkthroughNonNull = verify.filter((r: any) => r.ideal_walkthrough != null).length;
    console.log(`Cases with non-null pre_case_crammer:   ${crammerNonNull}/${verify.length}`);
    console.log(`Cases with non-null ideal_walkthrough:  ${walkthroughNonNull}/${verify.length}`);

    const failed = verify.filter((r: any) => !r.pre_case_crammer || !r.ideal_walkthrough);
    if (failed.length > 0) {
      console.log(`\nIncomplete cases (${failed.length}):`);
      for (const r of failed as any[]) {
        const missing: string[] = [];
        if (!r.pre_case_crammer) missing.push('crammer');
        if (!r.ideal_walkthrough) missing.push('walkthrough');
        console.log(`  ${r.id} — missing: ${missing.join(', ')} — ${r.title.slice(0, 60)}`);
      }
    }

    const sample = verify.find((r: any) => r.pre_case_crammer != null) as any;
    if (sample) {
      console.log(`\nSample industry_primer from "${sample.title.slice(0, 50)}":`);
      console.log(JSON.stringify(sample.pre_case_crammer.industry_primer, null, 2));
    }
  }

  console.log('\n[pregen] done.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
