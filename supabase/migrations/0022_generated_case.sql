-- 0022_generated_case.sql
-- PRD v3.1 Stage 2 — adversarial grounded case generator.
--
-- A generated case is built from a real seed case + its dossier to stress one
-- target micro-skill. It lands here in a DRAFT state, carries the fact-check
-- pass result, and is NEVER served to users until a human approves it — on
-- approval a row is copied into `cases` with `provenance.generated = true`.
--
-- The live `cases` table and every case-serving query are untouched by this.
--
-- NOTE: no migration runner — apply via `supabase migration up` or paste into
-- the Studio SQL editor. Idempotent.

create table if not exists generated_case (
  id                 uuid primary key default gen_random_uuid(),
  status             text not null default 'draft'
                       check (status in ('draft', 'approved', 'rejected')),
  seed_case_id       uuid references cases(id) on delete set null,
  target_skill_id    text not null,

  -- mirrors the `cases` shape so approval is a straight copy
  title              text not null,
  industry           text,
  case_type          text,
  difficulty         text,
  problem_statement  text not null,
  interviewer_notes  jsonb not null default '[]'::jsonb,
  ideal_structure    jsonb not null default '{}'::jsonb,
  exhibits           jsonb not null default '[]'::jsonb,

  -- provenance: { model, params, seed_case_id, seed_title, grounding_sources[],
  --               generated_at }
  generation         jsonb not null default '{}'::jsonb,
  -- second-pass result: { verdict: 'pass'|'fail', model, checked_at,
  --   claims: [{ text, kind: 'quant'|'entity', grounded: 'source'|'fictional'|'ungrounded', note }],
  --   code_flags: [string] }
  factcheck          jsonb not null default '{}'::jsonb,

  published_case_id  uuid references cases(id) on delete set null,
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewed_by        text
);

create index if not exists generated_case_status_idx on generated_case (status);
create index if not exists generated_case_skill_idx  on generated_case (target_skill_id);
create index if not exists generated_case_seed_idx   on generated_case (seed_case_id);

-- RLS ON, NO policies = deny-all to anon/authenticated. Drafts are ops data;
-- the generator + review scripts use the service-role client (bypasses RLS).
alter table generated_case enable row level security;

-- Review queue for the human:
--   select id, status, target_skill_id, title,
--          factcheck->>'verdict' as fc, created_at
--   from generated_case where status = 'draft' order by created_at;
