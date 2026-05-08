// src/lib/groq/dossier-context.ts
//
// Stream 4 of AI training plan (2026-05-08). Renders a per-case knowledge
// dossier as a system-prompt block so the AI has deep grounding to answer
// questions the casebook doesn't cover.
//
// Per docs/research/PER-CASE-KNOWLEDGE-DEPTH.md:
//   - Pattern A (case dossiers) is the highest-ROI fix for the question
//     buckets currently failing ("what's typical margin?", "who else is in
//     this market?", "real-world numbers")
//   - Renders compact summary at session start (top of prompt) so the AI
//     has the context THROUGHOUT the case, not just on the turns where
//     candidate explicitly asks domain questions
//
// 2026-05-08 v2: storage moved from Postgres JSONB to filesystem
// (data/dossiers/{case_id}.json) — no DB migration required. loadDossier()
// reads on-demand at chat-route entry; ~2-5ms per session start.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DOSSIER_DIR = path.resolve(process.cwd(), 'data', 'dossiers');

/**
 * Load a case's dossier from the filesystem.
 * Returns null if the file doesn't exist (case not yet enriched).
 * Fails open: any read/parse error returns null, never throws.
 */
export async function loadDossier(caseId: string): Promise<any | null> {
  if (!caseId || typeof caseId !== 'string') return null;
  // Sanitize: only UUID-shaped chars allowed in filename
  if (!/^[a-zA-Z0-9_-]+$/.test(caseId)) return null;
  try {
    const fp = path.join(DOSSIER_DIR, `${caseId}.json`);
    const txt = await readFile(fp, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export interface CaseDossier {
  schema_version?: string;
  industry_primer?: string;
  real_world_numbers?: { metric: string; value: string; source_hint?: string }[];
  expected_math?: { step: string; formula: string; typical_answer_range: string }[];
  common_mistakes?: string[];
  anticipated_questions?: { q: string; a: string; category: string }[];
  framework_hints?: string[];
  sources?: string[];
  case_type_notes?: string;
  enriched_at?: string;
}

/**
 * Render the dossier as a compact system-prompt block. Caps anticipated_questions
 * at top 5 to stay within token budget — full FAQ matching is a v2 feature.
 *
 * Returns empty string if dossier is missing/malformed so we don't waste tokens.
 */
export function renderDossierBlock(dossier: any): string {
  if (!dossier || typeof dossier !== 'object') return '';
  const d = dossier as CaseDossier;

  const parts: string[] = [];

  if (d.industry_primer && d.industry_primer.trim()) {
    parts.push(`Industry context: ${d.industry_primer.trim()}`);
  }

  if (d.real_world_numbers && Array.isArray(d.real_world_numbers) && d.real_world_numbers.length > 0) {
    const lines = d.real_world_numbers.slice(0, 8).map((n) => `  - ${n.metric}: ${n.value}`);
    parts.push(`Real-world benchmarks (use only when candidate asks for context):\n${lines.join('\n')}`);
  }

  if (d.common_mistakes && Array.isArray(d.common_mistakes) && d.common_mistakes.length > 0) {
    const lines = d.common_mistakes.slice(0, 5).map((m) => `  - ${m}`);
    parts.push(`Common candidate mistakes on this case (push back when you see these):\n${lines.join('\n')}`);
  }

  if (d.framework_hints && Array.isArray(d.framework_hints) && d.framework_hints.length > 0) {
    const lines = d.framework_hints.slice(0, 4).map((f) => `  - ${f}`);
    parts.push(`Case-specific framework angles:\n${lines.join('\n')}`);
  }

  if (d.anticipated_questions && Array.isArray(d.anticipated_questions) && d.anticipated_questions.length > 0) {
    // Top 5 most-likely questions + brief answers
    const lines = d.anticipated_questions.slice(0, 5).map((q) => `  Q: ${q.q}\n  A: ${q.a}`);
    parts.push(`Likely candidate questions + grounded answers (use when relevant):\n${lines.join('\n\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\n== CASE DOSSIER (deep knowledge for this specific case — use when candidate asks questions the problem_statement doesn't cover; never proactively dump) ==\n${parts.join('\n\n')}\n== END DOSSIER ==`;
}

/**
 * Quick check on whether a dossier has enough content to be worth injecting.
 * Defensive against malformed JSON, missing fields, partial enrichment runs.
 */
export function dossierIsUsable(dossier: any): boolean {
  if (!dossier || typeof dossier !== 'object') return false;
  const hasContent =
    (typeof dossier.industry_primer === 'string' && dossier.industry_primer.trim().length > 30) ||
    (Array.isArray(dossier.real_world_numbers) && dossier.real_world_numbers.length >= 3) ||
    (Array.isArray(dossier.anticipated_questions) && dossier.anticipated_questions.length >= 5);
  return hasContent;
}
