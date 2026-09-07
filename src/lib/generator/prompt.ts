// src/lib/generator/prompt.ts
//
// Pure prompt builders + defensive parsers for the Stage-2 case generator
// (PRD v3.1). Two LLM passes: GENERATE (build a full case that stresses one
// micro-skill, grounded in a real seed case + its dossier) and FACT-CHECK
// (a second model lists every quantitative claim / named real-world entity
// and marks each grounded / fictional / ungrounded).
//
// No I/O here — the LLM calls live in src/lib/generator/generate.ts so this
// file is unit-testable.

import { getSkill } from '@/lib/skills/taxonomy';

type Msg = { role: 'system' | 'user'; content: string };

export interface GeneratedCaseDraft {
  title: string;
  industry: string;
  caseType: string;
  difficulty: string;
  problemStatement: string;
  /** reveal-on-question notes: { trigger_keywords: string[], reveal_text: string } */
  interviewerNotes: { trigger_keywords: string[]; reveal_text: string }[];
  /** hypothesis / issue tree — kept loose, mirrors cases.ideal_structure */
  idealStructure: unknown;
  /** { title, kind, data, caption } — carried on the draft; wiring exhibits
   *  into the live serving path is a follow-up. */
  exhibits: { title: string; kind: string; data: unknown; caption?: string }[];
  /** entities the model deliberately invented (so fact-check knows they're ok) */
  fictionalEntities: string[];
  /** every quantitative figure in the case, with where it came from. Forces the
   *  model to account for each number; a number in the case with no entry here
   *  is a red flag for the fact-check + reviewer. */
  numberSources: { value: string; source: string }[];
}

export interface FactCheckClaim {
  text: string;
  kind: 'quant' | 'entity';
  grounded: 'source' | 'fictional' | 'ungrounded';
  note?: string;
}

export interface FactCheckResult {
  verdict: 'pass' | 'fail';
  claims: FactCheckClaim[];
  codeFlags: string[];
}

// ---------------------------------------------------------------- GENERATE ----

export function buildGenerateMessages(input: {
  seedTitle: string;
  seedProblemStatement: string;
  seedCaseType: string | null;
  seedIndustry: string | null;
  seedInterviewerNotes: unknown;
  dossierText: string;
  targetSkillId: string;
}): Msg[] {
  const skill = getSkill(input.targetSkillId);
  const skillLine = skill
    ? `${skill.name} — ${skill.observable}`
    : input.targetSkillId;

  const system = `You write consulting case-interview cases. Build ONE new case, in the same broad domain as the seed case below, deliberately engineered so a candidate cannot do well without demonstrating this micro-skill:

TARGET SKILL: ${skillLine}

GROUNDING RULES (hard — a violation gets the case rejected):
- Every NUMBER that appears anywhere in your case (problemStatement, interviewerNotes, idealStructure notes, exhibits) must be ONE of:
    (a) copied verbatim from the SEED or DOSSIER,
    (b) arithmetic derived from (a) — and the derivation must be reconstructable from other numbers in your case,
    (c) a round illustrative figure that belongs to an INVENTED entity you listed in "fictionalEntities" (e.g. invented client's own sales), clearly not a real-world statistic.
  Nothing else. In particular: do NOT state a market size, TAM, market share, category growth rate, penetration rate, or any aggregate industry statistic unless that exact figure is in the SEED or DOSSIER. If you need market context and don't have the number, describe it qualitatively ("a large, fast-growing category") — never attach a number to it.
- Every named real-world company / product / place must appear in the SEED or DOSSIER. Otherwise invent the entity and list it in "fictionalEntities". Prefer an invented client in a real, grounded market.
- List EVERY number in your case in "numberSources" with where it came from ("seed", "dossier", "derived: 6.25M x $1.50", or "illustrative: invented client's projected sales"). If you cannot fill a source for a number, remove that number.
- The case must be SOLVABLE and internally consistent: the numbers add up, the interviewer notes answer the questions a candidate would actually ask, the ideal structure fits.
- Difficulty: match or slightly exceed the seed.

SELF-CHECK before you answer: re-read your whole case. For each number, can you point to its "numberSources" entry, and is that entry (a), (b), or (c) above? If not, delete the number or make it qualitative. For each named real-world entity, is it in the SEED/DOSSIER or your fictionalEntities list? If not, rename it to an invented one.

OUTPUT — strict JSON, no prose outside it:
{
  "title": "...",
  "industry": "<one word, e.g. retail / fintech / manufacturing / other>",
  "caseType": "<profitability | market_entry | pricing | operations | mna | estimation | gtm | other>",
  "difficulty": "<easy | medium | hard>",
  "problemStatement": "2-5 sentences the interviewer reads out.",
  "interviewerNotes": [ { "trigger_keywords": ["short noun phrase", "..."], "reveal_text": "the answer if the candidate asks" } ],
  "idealStructure": { "root": "...", "branches": [ { "label": "...", "note": "why a top candidate digs here", "children": [ ... ] } ] },
  "exhibits": [ { "title": "...", "kind": "table | chart | text", "data": <inline data>, "caption": "..." } ],
  "fictionalEntities": ["names you invented"],
  "numberSources": [ { "value": "$150M", "source": "seed" }, { "value": "60%", "source": "derived: 12/20" } ]
}
interviewerNotes: 4-8 entries, 3-6 keywords each. exhibits: 0-2, only if they add signal for the target skill.`;

  const user = `SEED CASE: ${input.seedTitle}${input.seedCaseType ? ` (${input.seedCaseType})` : ''}${input.seedIndustry ? ` [${input.seedIndustry}]` : ''}

SEED PROBLEM STATEMENT:
${input.seedProblemStatement}

SEED INTERVIEWER NOTES (grounding — real facts the seed establishes):
${JSON.stringify(input.seedInterviewerNotes).slice(0, 4000)}

DOSSIER (verified real-world numbers + context for this domain):
${input.dossierText.slice(0, 6000)}

Write the new case now. Return JSON only.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function parseGeneratedCase(raw: string): GeneratedCaseDraft | null {
  const obj = extractJson(raw);
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const problemStatement =
    typeof o.problemStatement === 'string' ? o.problemStatement.trim() : '';
  if (!title || !problemStatement) return null;

  const notes = Array.isArray(o.interviewerNotes)
    ? (o.interviewerNotes as unknown[])
        .map((n) => {
          if (!n || typeof n !== 'object') return null;
          const nn = n as Record<string, unknown>;
          const kw = asStringArray(nn.trigger_keywords);
          const rt = typeof nn.reveal_text === 'string' ? nn.reveal_text : '';
          if (kw.length === 0 || !rt) return null;
          return { trigger_keywords: kw.slice(0, 8), reveal_text: rt };
        })
        .filter((n): n is { trigger_keywords: string[]; reveal_text: string } => n !== null)
    : [];

  const exhibits = Array.isArray(o.exhibits)
    ? (o.exhibits as unknown[])
        .map((e) => {
          if (!e || typeof e !== 'object') return null;
          const ee = e as Record<string, unknown>;
          return {
            title: typeof ee.title === 'string' ? ee.title : 'Exhibit',
            kind: typeof ee.kind === 'string' ? ee.kind : 'text',
            data: ee.data ?? null,
            caption: typeof ee.caption === 'string' ? ee.caption : undefined,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .slice(0, 3)
    : [];

  const numberSources = Array.isArray(o.numberSources)
    ? (o.numberSources as unknown[])
        .map((n) => {
          if (!n || typeof n !== 'object') return null;
          const nn = n as Record<string, unknown>;
          const value = typeof nn.value === 'string' ? nn.value : String(nn.value ?? '');
          const source = typeof nn.source === 'string' ? nn.source : '';
          if (!value || !source) return null;
          return { value: value.slice(0, 60), source: source.slice(0, 200) };
        })
        .filter((n): n is { value: string; source: string } => n !== null)
    : [];

  return {
    title,
    industry: typeof o.industry === 'string' ? o.industry : 'other',
    caseType: typeof o.caseType === 'string' ? o.caseType : 'other',
    difficulty: typeof o.difficulty === 'string' ? o.difficulty : 'medium',
    problemStatement,
    interviewerNotes: notes,
    idealStructure: o.idealStructure ?? {},
    exhibits,
    fictionalEntities: asStringArray(o.fictionalEntities),
    numberSources,
  };
}

// -------------------------------------------------------------- FACT-CHECK ----

export function buildFactCheckMessages(input: {
  draft: GeneratedCaseDraft;
  groundingText: string;
}): Msg[] {
  const caseText = [
    input.draft.problemStatement,
    ...input.draft.interviewerNotes.map((n) => n.reveal_text),
    JSON.stringify(input.draft.idealStructure),
    ...input.draft.exhibits.map((e) => `${e.title}: ${JSON.stringify(e.data)} ${e.caption ?? ''}`),
  ].join('\n');

  const system = `You are a fact-checker for a generated consulting case. You are given the generated case and the SOURCE MATERIAL it is supposed to be grounded in, plus a list of entities the author says they invented.

List EVERY quantitative claim (numbers, %, ₹/$ amounts, multiples, growth rates) and EVERY named real-world company / market / product in the generated case. For each, classify "grounded":
- "source"     — the figure/entity is present in, or directly derivable from, the source material
- "fictional"  — it is one of the author's declared invented entities, or an obviously illustrative/placeholder value
- "ungrounded" — a specific real-world number about a real company, or a real named entity's real attribute, that is NOT in the source

verdict = "fail" if ANY claim is "ungrounded"; otherwise "pass".

OUTPUT strict JSON, no prose outside it:
{ "verdict": "pass" | "fail",
  "claims": [ { "text": "the exact claim", "kind": "quant" | "entity", "grounded": "source" | "fictional" | "ungrounded", "note": "why" } ] }`;

  const user = `DECLARED INVENTED ENTITIES: ${JSON.stringify(input.draft.fictionalEntities)}

AUTHOR'S NUMBER-SOURCE CLAIMS (verify these are true; a number in the case that is missing here, or whose claimed source is wrong, is "ungrounded"):
${JSON.stringify(input.draft.numberSources)}

SOURCE MATERIAL (the only real-world facts this case may assert):
${input.groundingText.slice(0, 7000)}

GENERATED CASE:
${caseText.slice(0, 7000)}

Return the JSON now.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function parseFactCheck(raw: string, codeFlags: string[] = []): FactCheckResult {
  const obj = extractJson(raw);
  const o = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  const rawClaims = Array.isArray(o.claims) ? (o.claims as unknown[]) : [];
  const claims: FactCheckClaim[] = rawClaims
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const cc = c as Record<string, unknown>;
      const grounded =
        cc.grounded === 'source' || cc.grounded === 'fictional' || cc.grounded === 'ungrounded'
          ? cc.grounded
          : 'ungrounded';
      return {
        text: typeof cc.text === 'string' ? cc.text.slice(0, 300) : '',
        kind: cc.kind === 'entity' ? 'entity' : 'quant',
        grounded,
        note: typeof cc.note === 'string' ? cc.note.slice(0, 300) : undefined,
      } as FactCheckClaim;
    })
    .filter((c): c is FactCheckClaim => c !== null && c.text.length > 0);

  const anyUngrounded = claims.some((c) => c.grounded === 'ungrounded');
  // Fail on any ungrounded claim the LLM found, or an explicit LLM "fail".
  // `codeFlags` (the regex number-sweep) are NOISY — they surface for the
  // human reviewer in `--show`, but they do not by themselves force a fail
  // (the LLM pass routinely, and correctly, marks such numbers as
  // source-derived). A draft with only code flags and no ungrounded claim is
  // "pass but eyeball the flags".
  const verdict: 'pass' | 'fail' = anyUngrounded || o.verdict === 'fail' ? 'fail' : 'pass';

  return { verdict, claims, codeFlags };
}

// ------------------------------------------------------------- code checks ----

const NUM_RE = /(?:₹|\$|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:%|percent|bn|billion|mn|million|[mb]|cr|crore|lakh|k|x|×)?/gi;

/** Pull number-like tokens from text, normalised (lowercase, no spaces). */
export function numberSweep(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(NUM_RE)) {
    const t = m[0].trim().toLowerCase().replace(/\s+/g, '');
    // ignore bare small integers 0-31 (dates, counts, "3 reasons") — too noisy
    if (/^\d{1,2}$/.test(t) && Number(t) <= 31) continue;
    if (t.length >= 2) out.add(t);
  }
  return [...out];
}

/**
 * Cheap cross-check: any number-token in the draft that does not also appear in
 * the grounding text is a candidate "ungrounded" flag for a human to eyeball.
 * Deliberately loose — it produces warnings, not the verdict; the LLM pass +
 * human review are the real gate.
 */
export function crossCheckNumbers(draftText: string, groundingText: string): string[] {
  const g = numberSweep(groundingText).join(' | ');
  return numberSweep(draftText).filter((n) => !g.includes(n));
}

// --------------------------------------------------------------- json util ----

function extractJson(raw: string): unknown {
  if (!raw || typeof raw !== 'string') return null;
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/[[{][\s\S]*[\]}]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
