// src/lib/skills/knowledge-tracing.ts
//
// LLM knowledge tracing (PRD v3.1 Stage 1, ref arXiv:2409.16490): after a
// session is scored, one aux-tier pass reads the transcript and emits, per
// micro-skill that actually came up, how well the candidate demonstrated it
// and how hard this case made it. Those observations feed the Glicko-2 update
// in src/lib/skills/apply.ts.
//
// Pure + deterministic here (prompt building, response parsing). The LLM call
// and DB write live in apply.ts so this file stays unit-testable with no I/O.

import { SKILLS, isSkillId, type SkillId } from './taxonomy';

export interface TranscriptTurn {
  role: string;
  content: string;
}

export interface SkillObservation {
  skillId: SkillId;
  /** True only if the candidate had a genuine opportunity to show this skill.
   *  False observations carry no rating signal and are dropped by apply.ts. */
  demonstrated: boolean;
  /** 0 = clear miss, 1 = did it well. */
  quality: number;
  /** 0 = this case made the skill easy, 1 = made it hard. Sets the Glicko
   *  opponent strength for the match. */
  difficulty: number;
  /** 0..1 tracer confidence. apply.ts widens opponent RD when this is low. */
  confidence: number;
  /** Short verbatim quote or paraphrase anchoring the judgement. */
  evidence: string;
}

const CATALOG = SKILLS.map((s) => `- ${s.id}: ${s.name} — ${s.observable}`).join('\n');

export function buildTracingMessages(input: {
  transcript: TranscriptTurn[];
  caseTitle?: string | null;
  caseType?: string | null;
  /** Stage-4 GEPA optimizer only: try alternative wordings without touching
   *  the taxonomy. `observableOverrides` swaps a skill's "observable" line;
   *  `extraRules` appends bullet(s) to the Rules block. Unused in production. */
  opts?: {
    observableOverrides?: Record<string, string>;
    extraRules?: string;
  };
}): { role: 'system' | 'user'; content: string }[] {
  const overrides = input.opts?.observableOverrides ?? {};
  const catalog = Object.keys(overrides).length
    ? SKILLS.map((s) => `- ${s.id}: ${s.name} — ${overrides[s.id] ?? s.observable}`).join('\n')
    : CATALOG;
  const system = `You are an assessor doing knowledge tracing on a completed consulting case interview.

You are given the full transcript. For EACH micro-skill below that the candidate had a genuine opportunity to demonstrate during this case, output one observation. Do NOT invent observations for skills the case never called for — skip them entirely.

MICRO-SKILLS:
${catalog}

For each skill that came up, judge:
- demonstrated: true if the candidate got a real chance to show it (almost always true if you are listing it)
- quality: 0.0 (clear miss / did the opposite) to 1.0 (did it well and consistently); 0.5 = partial / uneven
- difficulty: 0.0 (this case made the skill trivial) to 1.0 (this case made it genuinely hard)
- confidence: 0.0 to 1.0 — how sure you are, given how much the transcript actually shows
- evidence: one short quote or paraphrase from the candidate's turns

Rules:
- Base every judgement ONLY on the candidate's own turns, not the interviewer's.
- Be calibrated: most real candidates are uneven. Reserve quality >= 0.85 for genuinely strong, sustained execution and quality <= 0.15 for clear failures.
- Output STRICT JSON: {"observations": [{"skillId": "...", "demonstrated": true, "quality": 0.0, "difficulty": 0.0, "confidence": 0.0, "evidence": "..."}]}
- skillId MUST be one of the ids above, verbatim. No other keys. No prose outside the JSON.${input.opts?.extraRules ? `\n${input.opts.extraRules}` : ''}`;

  const convo = input.transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join('\n\n')
    .slice(0, 24000);

  const user = `CASE: ${input.caseTitle ?? 'Untitled'}${input.caseType ? ` (${input.caseType})` : ''}

TRANSCRIPT:
${convo}

Return the JSON now.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function clamp01(x: unknown): number {
  const n = typeof x === 'number' ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Defensive parse: strips code fences, tolerates a bare array or the wrapped
 * object, drops any row with an unknown skillId or non-object shape, dedupes on
 * skillId (keeps the first). Never throws.
 */
export function parseTracingResponse(raw: string): SkillObservation[] {
  if (!raw || typeof raw !== 'string') return [];
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // last resort: grab the outermost {...} or [...]
    const m = text.match(/[[{][\s\S]*[\]}]/);
    if (!m) return [];
    try {
      data = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }

  const rows: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { observations?: unknown })?.observations)
      ? ((data as { observations: unknown[] }).observations)
      : [];

  const seen = new Set<string>();
  const out: SkillObservation[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const skillId = typeof o.skillId === 'string' ? o.skillId : '';
    if (!isSkillId(skillId) || seen.has(skillId)) continue;
    seen.add(skillId);
    out.push({
      skillId,
      demonstrated: o.demonstrated !== false,
      quality: clamp01(o.quality),
      difficulty: clamp01(o.difficulty),
      confidence: clamp01(o.confidence ?? 0.6),
      evidence: typeof o.evidence === 'string' ? o.evidence.slice(0, 400) : '',
    });
  }
  return out;
}
