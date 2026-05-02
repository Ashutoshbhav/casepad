// Pre-generate pre_case_crammer + ideal_walkthrough for the 10 hand-curated
// starter cases. Run once after a fresh DB or when the starter set changes.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/pregen-starter-content.ts
//
// Idempotent: skips cases whose pre_case_crammer is already non-null AND
// whose ideal_walkthrough is already non-null. If only one is missing,
// fills just that one.
//
// Sequential (1 case at a time, 1s sleep) to stay under Groq + Tavily rate
// limits. Per-case errors are logged and skipped — never aborts the whole run.
//
// IMPORTANT: This script forces use of hosted Groq (not the NVIDIA NIM
// fallback that .env.local sets up for ingest). Crammer + walkthrough are
// user-facing premium content — we want llama-3.3-70b-versatile via Groq,
// not whatever model is loaded for ingest. We mutate env BEFORE dynamic-
// importing the groq client so MODEL_LARGE evaluates correctly.

delete process.env.LLM_BASE_URL;
delete process.env.LLM_LOCAL_MODEL;

async function run() {
  // Dynamic imports happen AFTER env mutation so client.ts sees the
  // unpolluted environment when MODEL_LARGE is evaluated at module-load.
  const { createClient } = await import('@supabase/supabase-js');
  const { STARTER_CASE_IDS } = await import('../../src/lib/starter-cases');
  const { generatePreCaseCrammer } = await import('../../src/lib/groq/pre-case-crammer');
  const { generateIdealWalkthrough } = await import('../../src/lib/groq/walkthrough');
  const { MODEL_LARGE } = await import('../../src/lib/groq/client');
  type Track = import('../../src/lib/tracks').Track;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  console.log(`[pregen] LLM model: ${MODEL_LARGE}`);

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  interface Outcome {
    id: string;
    title: string;
    crammer_status: 'generated' | 'cached' | 'failed' | 'skipped';
    walkthrough_status: 'generated' | 'cached' | 'failed' | 'skipped';
    errors: string[];
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const startTime = Date.now();
  const outcomes: Outcome[] = [];

  console.log(`[pregen] Starting pre-generation for ${STARTER_CASE_IDS.length} starter cases`);
  console.log(`[pregen] Supabase: ${SUPABASE_URL}`);
  console.log('');

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
    const track = (((caseRow.tracks as string[] | null) && (caseRow.tracks as string[])[0]) || 'consulting') as Track;
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
        const crammer = await generatePreCaseCrammer(title, problem, track, []);
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
          errors.push('crammer: returned null');
          crammer_status = 'failed';
          console.error(`${idx} crammer: returned null`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`crammer: ${msg.slice(0, 200)}`);
        crammer_status = 'failed';
        console.error(`${idx} crammer: threw — ${msg.slice(0, 200)}`);
      }
    }

    // -------- ideal_walkthrough --------
    if (caseRow.ideal_walkthrough) {
      console.log(`${idx} walkthrough: already cached, skipping`);
      walkthrough_status = 'cached';
    } else {
      try {
        console.log(`${idx} walkthrough: generating…`);
        const walkthrough = await generateIdealWalkthrough(
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
          errors.push('walkthrough: returned null');
          walkthrough_status = 'failed';
          console.error(`${idx} walkthrough: returned null`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`walkthrough: ${msg.slice(0, 200)}`);
        walkthrough_status = 'failed';
        console.error(`${idx} walkthrough: threw — ${msg.slice(0, 200)}`);
      }
    }

    outcomes.push({ id: caseId, title, crammer_status, walkthrough_status, errors });

    // Polite pause between cases (Groq + Tavily rate-limit hygiene)
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

  // ----- Verification: re-query Supabase -----
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
      console.log(`\nFailed/incomplete cases (${failed.length}):`);
      for (const r of failed as any[]) {
        const missing: string[] = [];
        if (!r.pre_case_crammer) missing.push('crammer');
        if (!r.ideal_walkthrough) missing.push('walkthrough');
        console.log(`  ${r.id} — missing: ${missing.join(', ')} — ${r.title.slice(0, 60)}`);
      }
    }

    // Sample of one generated crammer's industry_primer
    const sample = verify.find((r: any) => r.pre_case_crammer != null) as any;
    if (sample) {
      console.log(`\nSample industry_primer from "${sample.title.slice(0, 50)}":`);
      console.log(JSON.stringify(sample.pre_case_crammer.industry_primer, null, 2));
    }
  }

  console.log('\n[pregen] done.');
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
