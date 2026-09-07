// src/lib/firm/levels.ts
//
// "The Firm" (PRD v3.1 Stage 3) — the consulting career ladder. You don't
// "do a case", you're an analyst at a firm taking engagements, and you get
// promoted when you've earned it. This file is the ladder + the promotion
// criteria; the progression math lives in src/lib/firm/progression.ts.
//
// Pure config. `level` is a 0-based index into LEVELS and is what
// firm_profile.level stores.

export interface FirmLevel {
  /** 0-based rank. */
  index: number;
  key: string;
  title: string;
  /** one-line "what this rank does" for the /firm page. */
  blurb: string;
  /** promotion criteria to REACH the NEXT level. null for the top rank. */
  promo: PromoCriteria | null;
}

export interface PromoCriteria {
  /** engagements completed while AT this level. */
  engagementsAtLevel: number;
  /** rolling average score over the last `avgWindow` engagements at this level. */
  avgScore: number;
  avgWindow: number;
  /** # of micro-skills whose band is "Solid" or "Strong". */
  skillsSolid: number;
  /** # of micro-skills whose band is "Strong". 0 = not required. */
  skillsStrong: number;
}

export const LEVELS: readonly FirmLevel[] = [
  {
    index: 0,
    key: 'analyst',
    title: 'Analyst',
    blurb: 'You run the analysis. Structure the problem, do the math, keep the workplan honest.',
    promo: { engagementsAtLevel: 5, avgScore: 50, avgWindow: 5, skillsSolid: 6, skillsStrong: 0 },
  },
  {
    index: 1,
    key: 'consultant',
    title: 'Consultant',
    blurb: 'You own a workstream end to end and take the first cut at the "so what".',
    promo: { engagementsAtLevel: 8, avgScore: 58, avgWindow: 6, skillsSolid: 10, skillsStrong: 2 },
  },
  {
    index: 2,
    key: 'senior_consultant',
    title: 'Senior Consultant',
    blurb: 'You carry the analytical spine of the engagement and coach the analysts under you.',
    promo: { engagementsAtLevel: 10, avgScore: 65, avgWindow: 6, skillsSolid: 15, skillsStrong: 3 },
  },
  {
    index: 3,
    key: 'engagement_manager',
    title: 'Engagement Manager',
    blurb: 'You run the room. Set the hypothesis, manage the client, drive to the recommendation.',
    promo: { engagementsAtLevel: 12, avgScore: 72, avgWindow: 8, skillsSolid: 20, skillsStrong: 8 },
  },
  {
    index: 4,
    key: 'principal',
    title: 'Principal',
    blurb: 'You shape the answer before the work starts and own the client relationship.',
    promo: { engagementsAtLevel: 15, avgScore: 78, avgWindow: 8, skillsSolid: 25, skillsStrong: 15 },
  },
  {
    index: 5,
    key: 'partner',
    title: 'Partner',
    blurb: 'You sell the work, stake your name on the recommendation, and build the firm.',
    promo: null,
  },
] as const;

export const TOP_LEVEL_INDEX = LEVELS.length - 1;

export function levelAt(index: number): FirmLevel {
  const i = Math.max(0, Math.min(TOP_LEVEL_INDEX, Math.round(index)));
  return LEVELS[i];
}
