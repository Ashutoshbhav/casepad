-- 0019_live_interview.sql
--
-- Enables the caseless live-interview mode (behavioral / culture-fit / résumé-
-- grounded) alongside the existing case-based sessions. This repo has no
-- migration runner (see comments in 0014/0015/0018) — paste this into the
-- Supabase Studio SQL editor manually.
--
-- 1) sessions.case_id was NOT NULL (0001_initial_schema.sql) — a caseless
--    session cannot exist under the old schema. Dropping the constraint is
--    additive/backward-compatible: every existing row already has a case_id,
--    so no data migration is needed, and no RLS policy references case_id
--    (sessions RLS keys only on user_id — see 0002_rls_policies.sql), so this
--    does not touch any existing RLS policy.
alter table sessions alter column case_id drop not null;

-- Optional firm name for culture-fit flavor on a caseless session (looked up
-- against FIRM_PACKS in src/lib/firm-packs.ts at chat-time, not validated
-- here — an unrecognized name just degrades to generic fit questions).
alter table sessions add column if not exists target_firm text;

-- 2) user_resumes — one row per user, upserted on (re-)upload. Only the
--    extracted text is kept; the raw PDF is never stored (matches this
--    repo's own precedent in 0014_interview_outcomes.sql: "no file/storage
--    infra yet" — avoids inventing private-file-storage policies from
--    scratch). New table, new RLS policies (owner-only), same shape as the
--    existing sessions_*_own policies in 0002_rls_policies.sql.
create table if not exists user_resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resume_text text not null,
  updated_at timestamptz not null default now()
);

alter table user_resumes enable row level security;

create policy "user_resumes_select_own" on user_resumes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "user_resumes_insert_own" on user_resumes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_resumes_update_own" on user_resumes
  for update to authenticated
  using (auth.uid() = user_id);
