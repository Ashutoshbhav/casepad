// 10 hand-curated starter cases for the first-time-user tutorial.
// All have: long problem_statement (>600 chars), recognizable consulting/PM
// title, classified case_type, easy or medium difficulty. The tutorial picks
// from this set so users never land on a 1-line garbage prompt on day 1.
//
// Pre-generated: pre_case_crammer + ideal_walkthrough + firm_pack run for
// each via scripts/qa/pregen-starter-content.mjs (foundation bundle 3).

export const STARTER_CASE_IDS = [
  '00b44543-2b35-4f77-b6c2-a1fe3c2da09f', // InvestCo (profitability, medium)
  'ec7ee7fa-6646-4e28-bee0-a821132ca065', // Whisky Brand Turnaround (profitability, medium)
  '94f69222-042d-41fe-82e0-b62330526ef3', // Design Your Own Doll Line (market_entry, medium)
  '122ddcb6-5843-4b97-b359-aa048c7e54a7', // Match My Doll Clothes Expansion (market_entry, medium)
  '5973d2aa-da45-44ca-aaee-133fdabfe4f3', // Zephyr Beverages (operations, hard)
  'a40af319-2678-4eb3-80a5-fe521d20bc4b', // Electronics Retailer (operations, medium)
  'a5803875-ec7b-48ef-83cf-49aae6901c06', // Clothing Chain Acquisition (mna, hard)
  'e7e74966-aaae-4d12-8a90-76941ac9a59f', // Zephyr Beverages (mna, medium)
  '9c52a767-f746-4178-b875-9279157d0f88', // American Beauty Company (gtm, medium)
  '6e018d7f-2440-47d8-8a92-c03c133bd386', // DigiBooks Inc. (gtm, easy)
  '9af07340-c417-4d09-bb9d-9a88a01190f7', // Estimating Instagram Photo Uploads (estimation, easy) — tutorial
];

// The single case used in the guided "first case" tutorial — pick the most
// approachable one. InvestCo is profitability/medium with a clear prompt.
// (Kept as default for legacy single-case launches.)
export const TUTORIAL_FIRST_CASE_ID = '00b44543-2b35-4f77-b6c2-a1fe3c2da09f';

// Tutorial menu — when a first-time user clicks "Take me through a case",
// they pick from these 4. Spans easy → medium difficulty + 4 different
// case types so users land on something they'd actually want to try.
//
// All four MUST have pre_case_crammer + ideal_walkthrough cached (so the
// first end-session debrief renders instantly, not a 20-sec lazy gen).
export interface TutorialCase {
  id: string;
  title: string;
  case_type: string;
  difficulty: string;
  emoji: string;
  one_liner: string;
}

// P1-10 from never-fail audit: emergency static fallback for /cases when
// Supabase is fully down. Returns shape-compatible CaseListRow[]. Used only
// when the main query fails after withRetry. Not the full library — just
// enough to keep the user able to start a case in degraded mode.
export interface StaticFallbackCase {
  id: string;
  title: string;
  industry: string | null;
  case_type: string;
  difficulty: string;
  source: string | null;
  problem_statement: string;
}

export const STATIC_FALLBACK_CASES: StaticFallbackCase[] = [
  {
    id: '9af07340-c417-4d09-bb9d-9a88a01190f7',
    title: 'Estimating Instagram Photo Uploads',
    industry: 'tech',
    case_type: 'estimation',
    difficulty: 'easy',
    source: 'CasePad starter',
    problem_statement:
      "How many photos are uploaded to Instagram every day worldwide? Walk me through your structured estimate — population segmentation, smartphone penetration, Instagram adoption, average upload frequency. Use round numbers.",
  },
  {
    id: '6e018d7f-2440-47d8-8a92-c03c133bd386',
    title: 'DigiBooks Inc.',
    industry: 'media',
    case_type: 'gtm',
    difficulty: 'easy',
    source: 'CasePad starter',
    problem_statement:
      "DigiBooks is a 2-year-old digital book startup that has built a strong content library but struggles with user acquisition. They have $5M to spend on go-to-market in the next 12 months. How would you allocate it across channels (paid social, content marketing, partnerships, B2B/library deals) and what would you test first?",
  },
  {
    id: '00b44543-2b35-4f77-b6c2-a1fe3c2da09f',
    title: 'InvestCo',
    industry: 'finance',
    case_type: 'profitability',
    difficulty: 'medium',
    source: 'CasePad starter',
    problem_statement:
      "InvestCo is a US-based investment firm with $2B AUM, currently focused on equities and bonds. The CEO is considering expanding into precious metals (gold, silver, platinum). Profits have been flat for 3 years. Should they enter? Walk me through how you'd evaluate this — market sizing, competitive intensity, capability fit, profitability impact.",
  },
  {
    id: '122ddcb6-5843-4b97-b359-aa048c7e54a7',
    title: 'Match My Doll Clothes Expansion',
    industry: 'retail',
    case_type: 'market_entry',
    difficulty: 'medium',
    source: 'CasePad starter',
    problem_statement:
      "Match My Doll Clothes (MMDC) makes premium clothing for collector dolls in the US, with $20M revenue and 12% growth. The CEO wants to expand the product line — adding accessories, dollhouse furniture, or themed playsets. Each requires different capability investments. Help her decide which line to enter first and why.",
  },
];

export const TUTORIAL_MENU: TutorialCase[] = [
  {
    id: '9af07340-c417-4d09-bb9d-9a88a01190f7',
    title: 'Estimating Instagram Photo Uploads',
    case_type: 'estimation',
    difficulty: 'easy',
    emoji: '🎲',
    one_liner: '5-min guesstimate. No data, just structured math + reasonable assumptions.',
  },
  {
    id: '6e018d7f-2440-47d8-8a92-c03c133bd386',
    title: 'DigiBooks Inc.',
    case_type: 'gtm',
    difficulty: 'easy',
    emoji: '🚀',
    one_liner: 'Go-to-market for a digital book startup. Channels, pricing, customer fit.',
  },
  {
    id: '00b44543-2b35-4f77-b6c2-a1fe3c2da09f',
    title: 'InvestCo',
    case_type: 'profitability',
    difficulty: 'medium',
    emoji: '💰',
    one_liner: 'Should InvestCo expand into precious metals? Classic profitability tree.',
  },
  {
    id: '122ddcb6-5843-4b97-b359-aa048c7e54a7',
    title: 'Match My Doll Clothes Expansion',
    case_type: 'market_entry',
    difficulty: 'medium',
    emoji: '🌍',
    one_liner: 'Should this doll-clothes brand expand its product line? Market entry case.',
  },
];
