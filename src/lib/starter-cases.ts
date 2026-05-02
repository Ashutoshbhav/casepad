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
];

// The single case used in the guided "first case" tutorial — pick the most
// approachable one. InvestCo is profitability/medium with a clear prompt.
export const TUTORIAL_FIRST_CASE_ID = '00b44543-2b35-4f77-b6c2-a1fe3c2da09f';
