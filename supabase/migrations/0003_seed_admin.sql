-- supabase/migrations/0003_seed_admin.sql
-- IMPORTANT: replace 'ash@example.com' with your real email before running.

insert into email_allowlist (email, added_by)
values ('ash@example.com', 'system')
on conflict (email) do nothing;

insert into cases (title, industry, case_type, difficulty, source, problem_statement, interviewer_notes, ideal_structure)
values (
  'Cement plant entry — India (sample)',
  'infra',
  'market_entry',
  'medium',
  'CasePad sample',
  'Our client is a global cement major considering entry into the Indian market. They want to know if they should enter, and if so, how. The cement market in India is large and growing but highly fragmented. The client is open to greenfield, brownfield, or partnership.',
  '[
    {"trigger_keywords": ["market size", "demand", "tonnage"], "reveal_text": "India consumes ~380 MT of cement annually, growing at ~6% CAGR. Top 5 players hold ~50% share."},
    {"trigger_keywords": ["competition", "players", "rivals"], "reveal_text": "Top players: UltraTech (~25%), Shree Cement, Ambuja, ACC, Dalmia. Tier-2 regional players hold the rest."},
    {"trigger_keywords": ["cost structure", "input", "limestone"], "reveal_text": "Limestone is the largest cost. Eastern and southern India have abundant deposits; western India is constrained."},
    {"trigger_keywords": ["client capabilities", "advantages"], "reveal_text": "The client has world-leading kiln efficiency tech and a strong balance sheet."}
  ]'::jsonb,
  '{
    "framework": "Market Entry",
    "branches": [
      {"node": "Market attractiveness", "subnodes": ["Size & growth", "Profitability", "Regulation"]},
      {"node": "Client fit", "subnodes": ["Capabilities", "Cost position", "Brand"]},
      {"node": "Entry mode", "subnodes": ["Greenfield", "Brownfield", "Partnership", "Acquisition"]},
      {"node": "Risks", "subnodes": ["Capacity overhang", "Regulation", "Limestone access"]}
    ],
    "key_insights": [
      "Tech advantage matters most where cost competition is fiercest",
      "Limestone access dictates plant location",
      "Acquisition of a regional player may beat greenfield on time-to-market"
    ]
  }'::jsonb
)
on conflict do nothing;
