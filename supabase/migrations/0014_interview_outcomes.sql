-- Verified practice→placement outcome capture.
--
-- APPLY: this repo has no migration runner (note the duplicate 0012_* files).
-- Apply by pasting this whole file into Supabase Studio → SQL editor → Run:
--   https://supabase.com/dashboard/project/cjanrluuqzyrpjtmuilc/sql/new
-- Until applied, the feature fails open (no-op): the nudge still shows, the
-- form returns reason:'not_ready', and history renders empty.
--
-- The moat-relevant table: a user logs a REAL consulting interview they had
-- (firm, date, what was actually asked, outcome) tied to their CasePad
-- account. Rejections are captured deliberately (not just offers) to avoid
-- survivorship bias. Verification is text-only for v1 (pasted offer/reject
-- email snippet or recruiter contact) — no file/storage infra yet.
--
-- Written from a server action using the USER-scoped client (not service
-- role), so this table gets full owner-scoped RLS (select/insert/update/
-- delete) — same pattern as cohort_notes (0010), NOT the read-only
-- service-role pattern of daily_assignments (0011).
--
-- outcome is a text + CHECK (not a pg enum) so this migration stays
-- idempotent on re-paste in Supabase Studio.

create table if not exists interview_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  firm text not null,
  role text,
  interview_date date not null,
  round text,
  outcome text not null
    check (outcome in ('offered', 'rejected', 'pending', 'withdrew')),
  asked text,
  case_topics text[] not null default '{}',
  verification text,
  prepared_with_casepad boolean not null default false,
  verified boolean not null default false,
  source text not null default 'outcomes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_outcomes_user_idx
  on interview_outcomes (user_id, created_at desc);

alter table interview_outcomes enable row level security;

drop policy if exists interview_outcomes_read on interview_outcomes;
create policy interview_outcomes_read
  on interview_outcomes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists interview_outcomes_insert on interview_outcomes;
create policy interview_outcomes_insert
  on interview_outcomes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists interview_outcomes_update on interview_outcomes;
create policy interview_outcomes_update
  on interview_outcomes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists interview_outcomes_delete on interview_outcomes;
create policy interview_outcomes_delete
  on interview_outcomes for delete
  to authenticated
  using (auth.uid() = user_id);
