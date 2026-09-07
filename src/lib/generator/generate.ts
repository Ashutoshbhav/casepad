// src/lib/generator/generate.ts
//
// Stage-2 generator orchestration (PRD v3.1). generateAndStage():
//   seed case + dossier -> GENERATE pass (primary tier) -> parse
//   -> FACT-CHECK pass (aux tier) + code number cross-check
//   -> insert a `generated_case` row in status 'draft'
// Nothing is served to users. A human approves via scripts/qa/review-generated.ts.
//
// Not server-only: the review + generate scripts import this.

import type { SupabaseClient } from '@supabase/supabase-js';
import { completeChat } from '@/lib/llm-router';
import { loadDossier } from '@/lib/groq/dossier-context';
import { isSkillId } from '@/lib/skills/taxonomy';
import {
  buildGenerateMessages,
  parseGeneratedCase,
  buildFactCheckMessages,
  parseFactCheck,
  crossCheckNumbers,
  type GeneratedCaseDraft,
  type FactCheckResult,
} from './prompt';

const GEN_MODEL_TAG = 'router:primary';
const FC_MODEL_TAG = 'router:aux';

export interface StageResult {
  id: string;
  verdict: FactCheckResult['verdict'];
  ungroundedCount: number;
  codeFlags: string[];
  draftTitle: string;
}

function dossierToText(d: any): string {
  if (!d || typeof d !== 'object') return '(no dossier for the seed case)';
  const parts: string[] = [];
  if (Array.isArray(d.real_world_numbers)) {
    parts.push('REAL-WORLD NUMBERS:\n' + d.real_world_numbers.map((x: any) =>
      typeof x === 'string' ? `- ${x}` : `- ${JSON.stringify(x)}`).join('\n'));
  }
  for (const k of ['market_context', 'typical_economics', 'key_players', 'common_mistakes', 'summary']) {
    if (d[k]) parts.push(`${k.toUpperCase()}:\n${typeof d[k] === 'string' ? d[k] : JSON.stringify(d[k])}`);
  }
  return parts.join('\n\n') || JSON.stringify(d).slice(0, 4000);
}

export async function generateAndStage(
  supabase: SupabaseClient,
  input: { seedCaseId: string; targetSkillId: string },
): Promise<StageResult> {
  if (!isSkillId(input.targetSkillId)) {
    throw new Error(`unknown target skill: ${input.targetSkillId}`);
  }

  const { data: seed, error } = await supabase
    .from('cases')
    .select('id, title, industry, case_type, problem_statement, interviewer_notes')
    .eq('id', input.seedCaseId)
    .single();
  if (error || !seed) throw new Error(`seed case ${input.seedCaseId} not found: ${error?.message ?? ''}`);

  const dossier = await loadDossier(input.seedCaseId);
  const dossierText = dossierToText(dossier);

  // ---- GENERATE ----
  const genRaw = await completeChat({
    tier: 'primary',
    messages: buildGenerateMessages({
      seedTitle: seed.title,
      seedProblemStatement: seed.problem_statement,
      seedCaseType: seed.case_type ?? null,
      seedIndustry: seed.industry ?? null,
      seedInterviewerNotes: seed.interviewer_notes ?? [],
      dossierText,
      targetSkillId: input.targetSkillId,
    }),
    max_tokens: 3500,
    temperature: 0.5,
    json: true,
  });
  const draft = parseGeneratedCase(genRaw);
  if (!draft) throw new Error('generator returned an unparseable case');

  // ---- FACT-CHECK ----
  const groundingText = [
    `SEED CASE: ${seed.title}`,
    seed.problem_statement,
    JSON.stringify(seed.interviewer_notes ?? []),
    dossierText,
  ].join('\n\n');

  const draftText = [
    draft.problemStatement,
    ...draft.interviewerNotes.map((n) => n.reveal_text),
    JSON.stringify(draft.idealStructure),
    ...draft.exhibits.map((e) => `${e.title}: ${JSON.stringify(e.data)}`),
  ].join('\n');

  const codeFlags = crossCheckNumbers(draftText, groundingText)
    .filter((n) => !draft.fictionalEntities.some((f) => f.toLowerCase().includes(n)))
    .map((n) => `number "${n}" in the draft is not in the grounding material`);

  let fc: FactCheckResult;
  try {
    const fcRaw = await completeChat({
      tier: 'aux',
      messages: buildFactCheckMessages({ draft, groundingText }),
      max_tokens: 2000,
      temperature: 0,
      json: true,
    });
    fc = parseFactCheck(fcRaw, codeFlags);
  } catch (e) {
    // fact-check unavailable -> fail closed (a draft that can't be checked is
    // not eligible for approval).
    fc = {
      verdict: 'fail',
      claims: [],
      codeFlags: [...codeFlags, `fact-check pass errored: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  const now = new Date().toISOString();
  const row = {
    status: 'draft' as const,
    seed_case_id: seed.id,
    target_skill_id: input.targetSkillId,
    title: draft.title,
    industry: draft.industry,
    case_type: draft.caseType,
    difficulty: draft.difficulty,
    problem_statement: draft.problemStatement,
    interviewer_notes: draft.interviewerNotes,
    ideal_structure: draft.idealStructure,
    exhibits: draft.exhibits,
    generation: {
      model: GEN_MODEL_TAG,
      fact_check_model: FC_MODEL_TAG,
      params: { temperature: 0.5 },
      seed_case_id: seed.id,
      seed_title: seed.title,
      grounding_sources: [
        `seed:${seed.id}`,
        dossier ? `dossier:${seed.id}` : 'dossier:none',
      ],
      fictional_entities: draft.fictionalEntities,
      number_sources: draft.numberSources,
      generated_at: now,
    },
    factcheck: {
      verdict: fc.verdict,
      model: FC_MODEL_TAG,
      checked_at: now,
      claims: fc.claims,
      code_flags: fc.codeFlags,
    },
  };

  const { data: inserted, error: insErr } = await supabase
    .from('generated_case')
    .insert(row)
    .select('id')
    .single();
  if (insErr || !inserted) throw new Error(`insert failed: ${insErr?.message ?? ''}`);

  return {
    id: inserted.id,
    verdict: fc.verdict,
    ungroundedCount: fc.claims.filter((c) => c.grounded === 'ungrounded').length,
    codeFlags: fc.codeFlags,
    draftTitle: draft.title,
  };
}

// ---- approval: copy a draft into the live `cases` table ----

export async function approveGenerated(
  supabase: SupabaseClient,
  generatedId: string,
  reviewedBy: string,
): Promise<{ publishedCaseId: string }> {
  const { data: g, error } = await supabase
    .from('generated_case')
    .select('*')
    .eq('id', generatedId)
    .single();
  if (error || !g) throw new Error(`generated_case ${generatedId} not found`);
  if (g.status === 'approved' && g.published_case_id) {
    return { publishedCaseId: g.published_case_id };
  }
  if ((g.factcheck as any)?.verdict !== 'pass') {
    throw new Error('refusing to approve: fact-check verdict is not "pass"');
  }

  const { data: newCase, error: cErr } = await supabase
    .from('cases')
    .insert({
      title: g.title,
      industry: g.industry ?? 'other',
      case_type: g.case_type ?? 'other',
      difficulty: g.difficulty ?? 'medium',
      source: 'CasePad generated',
      problem_statement: g.problem_statement,
      interviewer_notes: g.interviewer_notes ?? [],
      ideal_structure: g.ideal_structure ?? {},
      tags: ['generated'],
      provenance: {
        generated: true,
        generated_case_id: g.id,
        seed_case_id: g.seed_case_id,
        target_skill_id: g.target_skill_id,
        factcheck_verdict: (g.factcheck as any)?.verdict,
        approved_by: reviewedBy,
        approved_at: new Date().toISOString(),
        generation: g.generation,
      },
    })
    .select('id')
    .single();
  if (cErr || !newCase) throw new Error(`publish insert failed: ${cErr?.message ?? ''}`);

  await supabase
    .from('generated_case')
    .update({
      status: 'approved',
      published_case_id: newCase.id,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', generatedId);

  return { publishedCaseId: newCase.id };
}

export async function rejectGenerated(
  supabase: SupabaseClient,
  generatedId: string,
  reviewedBy: string,
): Promise<void> {
  await supabase
    .from('generated_case')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq('id', generatedId);
}

export type { GeneratedCaseDraft };
