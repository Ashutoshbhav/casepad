// src/lib/case-clarifiers.ts
//
// Per-case-type CLARIFYING-QUESTION banks. These are framework knowledge (the
// sharp opening questions a strong candidate asks before structuring), NOT
// factual claims — so no web-verification is needed. Distilled from a B-school
// faculty's structured-thinking course + standard consulting case method.
//
// Keyed to the engine's CaseType enum (see src/lib/groq/walkthrough.ts). Used to
// ground the "clarify" step of the ideal walkthrough so step 1 names the RIGHT
// 2-3 questions for the case type instead of a generic "I'd clarify scope".
//
// PURE + STATIC. Renderer is total (never throws). Additive context only —
// safe in the Fortress generation paths.

import type { CaseType } from '@/lib/groq/walkthrough';

export interface Clarifier {
  q: string;
  why: string;
}

// Asked in EVERY case, in this sequence, before structuring. Kept short (the
// per-type bank below adds the specifics).
export const UNIVERSAL_CLARIFIERS: Clarifier[] = [
  { q: 'What exactly is the objective, and how is success measured?', why: 'A profit goal, a revenue goal, and a user-count goal each lead to a different tree.' },
  { q: 'What geography / scope are we in (India, one city, one vertical)?', why: 'Bounds the problem before any sizing or structuring.' },
  { q: 'Over what time frame, and is this a new trend or a one-time event?', why: 'Drives whether to look at seasonality vs a structural shift.' },
];

const BANK: Record<CaseType, Clarifier[]> = {
  profitability: [
    { q: 'Is the decline in profit (₹) or profitability (margin %)?', why: 'They require different analyses — one is a number, one is a ratio.' },
    { q: 'Has revenue fallen, have costs risen, or both?', why: 'Sets which side of the tree to attack first (Pareto the bigger driver).' },
    { q: 'Is it across all products/segments or one line? (check product mix)', why: 'A mix shift to low-margin SKUs hides as a margin drop with flat revenue.' },
    { q: 'How many revenue streams exist?', why: 'Always map all income sources before diving into any one.' },
    { q: 'If a cost issue — is it fixed, variable, or semi-variable?', why: 'Fixed-cost spikes (new facility, headcount) vs per-unit input costs need different fixes.' },
  ],
  market_entry: [
    { q: 'Why does the client want to enter — growth, defend the core, or diversify?', why: 'The motivation shapes the whole framework and the success bar.' },
    { q: 'Is it a new geography, a new product, or both?', why: 'Existing-product-new-market vs new-product needs different analysis.' },
    { q: 'What does "success" look like (revenue, share, profitability timeline)?', why: 'Without it you cannot judge feasibility.' },
    { q: 'Build, buy, or partner — and on what timeline?', why: 'Each has a different risk/speed/cost profile.' },
  ],
  pricing: [
    { q: 'Is the customer price-sensitive (B2C mass) or not (luxury/B2B)?', why: 'Elasticity decides whether price moves help or hurt.' },
    { q: 'Does the client even control the price, or is it market-set/regulated?', why: 'Commodities (gold) and regulated goods cannot be freely repriced.' },
    { q: 'What pricing strategy is used today — cost, value, competitor, or market based?', why: 'Understand the baseline before recommending a change.' },
    { q: 'What is the competitive landscape (leader vs follower)?', why: 'A leader prices on value; a follower matches or undercuts.' },
  ],
  mna: [
    { q: 'What is the strategic rationale for the deal?', why: 'Synergy hunt vs market access vs talent each changes the lens.' },
    { q: 'What is the stand-alone value of each company?', why: 'You value each alone first, then layer synergies on top.' },
    { q: 'What synergies are expected — revenue, cost, or both — and how real?', why: 'Synergy = combined value minus the sum of parts; most deals over-claim it.' },
    { q: 'Any integration, culture, or regulatory blockers?', why: 'These kill more deals than the financials do.' },
  ],
  operations: [
    { q: 'Where in the value chain is the problem — sourcing, making, distribution, or post-sales?', why: 'Each stage is a different cost lever.' },
    { q: 'Is this a supply/cost issue or a demand issue?', why: 'High unit cost vs too-little volume to spread fixed cost need opposite fixes.' },
    { q: 'What is the current capacity utilisation?', why: 'Low utilisation = fixed cost spread over fewer units = high cost/unit.' },
    { q: 'Is make-vs-buy on the table for any step?', why: 'Outsourcing can cut cost but adds dependency/quality risk.' },
  ],
  estimation: [
    { q: 'What time frame — per day, per year? And as of when?', why: 'A stock vs an annual flow are different questions.' },
    { q: 'What geography — India, a metro, urban only?', why: 'Default to India if unsaid, but confirm the addressable base.' },
    { q: 'What metric — revenue (₹), units, or users?', why: 'Decides whether the tree ends in price or in count.' },
    { q: 'What scope — which segments/uses count?', why: 'E.g. a tennis ball serves tennis + street cricket + pet toys; exhaust the uses.' },
    { q: 'How does this business make money? (confirm the model)', why: 'Prevents sizing the wrong thing.' },
  ],
  growth_metrics: [
    { q: 'How big is the move — 5% or 50%?', why: 'Quantum tells you urgency and how deep to dig.' },
    { q: 'Is it a new trend or a one-time dip, and since when?', why: 'Separates seasonality from a structural break.' },
    { q: 'Is it just us, or the whole industry?', why: 'Industry-wide → external/market cause; only us → internal.' },
    { q: 'Which segment/platform/geo is it concentrated in?', why: 'Isolating where it moved is half the diagnosis.' },
    { q: 'On a demand drop — have we checked supply first?', why: 'A supply shortage (fewer drivers/sellers) often looks like a demand drop.' },
  ],
  product_design: [
    { q: 'Who is the user — which segment, and what is their job-to-be-done?', why: 'Design for a specific persona, not "everyone".' },
    { q: 'What problem are we solving, and what is the business goal?', why: 'User need and business objective must both be named.' },
    { q: 'What is the success metric (and what would game it)?', why: 'A leading metric plus its abuse risk shows product maturity.' },
    { q: 'Any platform or resource constraints?', why: 'Mobile-first vs web, budget, and timeline bound the solution space.' },
  ],
  behavioral: [
    { q: 'What competency is the question really probing (leadership, conflict, failure)?', why: 'Pick the story that best evidences that specific trait.' },
    { q: 'How much detail / time do you want?', why: 'Calibrate the STAR depth to the interviewer.' },
  ],
  unknown: UNIVERSAL_CLARIFIERS,
};

/** Clarifiers for a case type. Pure + total — falls back to the universal set. */
export function clarifiersFor(caseType: CaseType): Clarifier[] {
  return BANK[caseType] ?? UNIVERSAL_CLARIFIERS;
}

/**
 * Compact prompt block of the right clarifying questions for this case type,
 * for injection into ideal-answer generation. Total + fail-safe (returns ''
 * only if somehow given nothing renderable).
 */
export function renderClarifiers(caseType: CaseType): string {
  const list = clarifiersFor(caseType);
  if (!list.length) return '';
  const lines = [
    'CLARIFY-FIRST QUESTIONS (a top candidate asks 2-3 of these before structuring; ground step 1 of the walkthrough in the most relevant ones):',
  ];
  for (const c of list) lines.push(`- ${c.q} (why: ${c.why})`);
  return lines.join('\n');
}
