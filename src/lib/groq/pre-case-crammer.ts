// Adaptive Pre-Case Crammer — generates a 30-second cheat sheet specific to
// THIS case + the user's weakest scoring dimensions + web-researched
// industry primer. Cached on the cases table after first generation.

import { groq, MODEL_LARGE } from './client';
import { researchCase } from '../research/tavily';
import type { Track } from '../tracks';
import { TRACKS } from '../tracks';

export interface PreCaseCrammer {
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

export async function generatePreCaseCrammer(
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
    console.warn('crammer research skipped:', (err as Error).message);
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

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_LARGE,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1800,
    });
    const content = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(content) as PreCaseCrammer;
    parsed.sources = sources;
    return parsed;
  } catch (err) {
    console.error('crammer generation failed:', (err as Error).message);
    return null;
  }
}
