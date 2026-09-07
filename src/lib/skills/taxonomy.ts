// src/lib/skills/taxonomy.ts
//
// The per-skill learner model's backbone (PRD v3.1 Stage 1 — "the Twin").
// ~40 consulting case-interview micro-skills, six groups, each phrased as an
// OBSERVABLE behaviour so the knowledge-tracing pass (src/lib/skills/
// knowledge-tracing.ts) can look for evidence of it in a transcript.
//
// Grounding: standard MBB assessment dimensions (structuring, quantitative,
// analytical, synthesis, communication, business judgment) broken down to the
// grain at which a single answer either shows the skill or doesn't. Deliberately
// behavioural, not trait-based ("states a hypothesis early", not "is smart").
//
// This is a static constant, not a table — the taxonomy changes with code, and
// skill_state / skill_obs rows key off these string ids.

export type SkillGroup =
  | 'structuring'
  | 'quantitative'
  | 'analysis'
  | 'synthesis'
  | 'communication'
  | 'business_judgment';

export interface Skill {
  /** Stable id — used as the key in skill_state / skill_obs. Never renumber. */
  id: string;
  group: SkillGroup;
  name: string;
  /** What "demonstrating this" looks like in a candidate's turns. Fed verbatim
   *  into the knowledge-tracing prompt. */
  observable: string;
}

export const SKILL_GROUPS: Record<SkillGroup, string> = {
  structuring: 'Structuring',
  quantitative: 'Quantitative',
  analysis: 'Analysis',
  synthesis: 'Synthesis & Recommendation',
  communication: 'Communication & Presence',
  business_judgment: 'Business Judgment',
};

export const SKILLS: readonly Skill[] = [
  // ---- Structuring ----
  { id: 'clarifying_questions', group: 'structuring', name: 'Clarifying questions', observable: 'Asks a few targeted clarifying questions about objective, scope, or context before diving into a structure.' },
  { id: 'mece_decomposition', group: 'structuring', name: 'MECE decomposition', observable: 'Breaks the problem into buckets that do not overlap and together cover the whole problem.' },
  { id: 'hypothesis_first', group: 'structuring', name: 'Hypothesis-first', observable: 'States an early point of view or hypothesis about the likely answer, rather than only listing areas to explore.' },
  { id: 'issue_tree_depth', group: 'structuring', name: 'Issue-tree depth', observable: 'Drills at least one branch of the structure down to a specific, testable, or actionable level rather than staying one level deep.' },
  { id: 'tailored_structure', group: 'structuring', name: 'Tailored structure', observable: 'The structure is built for this specific problem, not a generic memorised framework applied wholesale.' },
  { id: 'prioritization', group: 'structuring', name: 'Prioritisation', observable: 'Explicitly chooses which part of the structure to investigate first and gives a reason.' },
  { id: 'driver_based_thinking', group: 'structuring', name: 'Driver-based thinking', observable: 'Frames the problem around the levers that actually move the target metric (e.g. price x volume x cost), not just topic areas.' },

  // ---- Quantitative ----
  { id: 'estimation_setup', group: 'quantitative', name: 'Estimation setup', observable: 'Sets up an estimate with a clear equation and sensible segmentation before plugging in numbers.' },
  { id: 'assumption_transparency', group: 'quantitative', name: 'Assumption transparency', observable: 'States assumptions out loud and flags which ones the answer most depends on.' },
  { id: 'arithmetic_accuracy', group: 'quantitative', name: 'Arithmetic accuracy', observable: 'The actual calculations performed are correct.' },
  { id: 'sanity_checking', group: 'quantitative', name: 'Sanity-checking', observable: 'Checks whether a computed number is plausible against an order-of-magnitude expectation or a known benchmark.' },
  { id: 'sensitivity_awareness', group: 'quantitative', name: 'Sensitivity awareness', observable: 'Identifies which input the answer is most sensitive to, or how the answer changes if a key assumption moves.' },
  { id: 'unit_discipline', group: 'quantitative', name: 'Unit discipline', observable: 'Keeps units, currencies, and timeframes consistent throughout (per year vs per month, one store vs the chain).' },
  { id: 'quant_to_insight', group: 'quantitative', name: 'Number to insight', observable: 'Turns a computed figure into a "so what" for the client rather than stopping at the number.' },

  // ---- Analysis ----
  { id: 'exhibit_reading', group: 'analysis', name: 'Exhibit reading', observable: 'Pulls the correct main takeaway from a chart or table quickly and states it.' },
  { id: 'data_interpretation', group: 'analysis', name: 'Data interpretation', observable: 'Draws correct inferences from the data given and resists over-reading beyond what the data supports.' },
  { id: 'root_cause_isolation', group: 'analysis', name: 'Root-cause isolation', observable: 'Separates a symptom from its underlying cause and tests candidate causes rather than guessing.' },
  { id: 'comparative_benchmarking', group: 'analysis', name: 'Comparative benchmarking', observable: 'Uses a comparison (competitor, prior period, other segment) to locate where the problem actually is.' },
  { id: 'pattern_recognition', group: 'analysis', name: 'Pattern recognition', observable: 'Recognises the case archetype (profitability, market entry, pricing, etc.) and the usual failure modes for it.' },
  { id: 'quantifying_impact', group: 'analysis', name: 'Quantifying impact', observable: 'Sizes the opportunity or the problem in numbers rather than leaving it qualitative.' },
  { id: 'incorporating_new_info', group: 'analysis', name: 'Incorporating new information', observable: 'Updates the analysis or structure when the interviewer introduces a new fact or constraint.' },

  // ---- Synthesis & Recommendation ----
  { id: 'so_what_synthesis', group: 'synthesis', name: 'So-what synthesis', observable: 'Rolls individual findings up into a clear "therefore" rather than leaving them as loose observations.' },
  { id: 'recommendation_clarity', group: 'synthesis', name: 'Recommendation clarity', observable: 'Gives a crisp, decisive recommendation when asked, not a hedged "it depends".' },
  { id: 'recommendation_grounding', group: 'synthesis', name: 'Recommendation grounding', observable: 'The recommendation follows logically from the analysis actually performed in the case.' },
  { id: 'risk_articulation', group: 'synthesis', name: 'Risk articulation', observable: 'Names the main risks to the recommendation or what would make it wrong.' },
  { id: 'next_steps', group: 'synthesis', name: 'Next steps', observable: 'Proposes concrete next steps or what still needs to be validated.' },
  { id: 'executive_summary', group: 'synthesis', name: 'Executive summary', observable: 'Can deliver a top-down 30-second answer on demand (recommendation first, then the two or three reasons).' },
  { id: 'tradeoff_reasoning', group: 'synthesis', name: 'Trade-off reasoning', observable: 'Weighs options explicitly against each other rather than advocating one in isolation.' },

  // ---- Communication & Presence ----
  { id: 'signposting', group: 'communication', name: 'Signposting', observable: 'Tells the interviewer where they are in their thinking and where they are going next.' },
  { id: 'concision', group: 'communication', name: 'Concision', observable: 'Makes the point without rambling or circling back repeatedly.' },
  { id: 'top_down_delivery', group: 'communication', name: 'Top-down delivery', observable: 'Leads with the answer or headline, then supports it (Pyramid Principle), rather than building up to it.' },
  { id: 'structured_verbalization', group: 'communication', name: 'Structured verbalisation', observable: 'Spoken answers have audible structure ("three reasons: first..., second...").' },
  { id: 'active_listening', group: 'communication', name: 'Active listening', observable: 'Responds to what was actually asked and picks up on the interviewer’s cues or hints.' },
  { id: 'poise_under_pressure', group: 'communication', name: 'Poise under pressure', observable: 'Stays composed and constructive when challenged, corrected, or pushed.' },
  { id: 'collaborative_tone', group: 'communication', name: 'Collaborative tone', observable: 'Treats the case as joint problem-solving with the interviewer rather than a test to survive.' },

  // ---- Business Judgment ----
  { id: 'industry_sense', group: 'business_judgment', name: 'Industry sense', observable: 'Brings relevant real-world business or industry knowledge to bear on the problem.' },
  { id: 'commercial_instinct', group: 'business_judgment', name: 'Commercial instinct', observable: 'Reasons realistically about profit, cost structure, pricing, and willingness to pay.' },
  { id: 'creativity', group: 'business_judgment', name: 'Creativity', observable: 'Generates non-obvious but relevant ideas or angles.' },
  { id: 'pragmatism', group: 'business_judgment', name: 'Pragmatism', observable: 'Proposed solutions are feasible and account for implementation reality, not just theory.' },
  { id: 'customer_orientation', group: 'business_judgment', name: 'Customer orientation', observable: 'Reasons from the end customer or user, not only from the client’s P&L.' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];

export const SKILL_IDS: readonly string[] = SKILLS.map((s) => s.id);

const _byId = new Map(SKILLS.map((s) => [s.id, s]));
export function getSkill(id: string): Skill | undefined {
  return _byId.get(id);
}
export function isSkillId(id: string): id is SkillId {
  return _byId.has(id);
}

export function skillsByGroup(): Record<SkillGroup, Skill[]> {
  const out = {} as Record<SkillGroup, Skill[]>;
  for (const g of Object.keys(SKILL_GROUPS) as SkillGroup[]) out[g] = [];
  for (const s of SKILLS) out[s.group].push(s);
  return out;
}
