-- Bring-your-own-case (BYOC) — private user-submitted cases.
--
-- APPLY: this repo has no migration runner. Paste the whole file into
-- Supabase Studio → SQL editor → Run:
--   https://supabase.com/dashboard/project/cjanrluuqzyrpjtmuilc/sql/new
--
-- Until applied: the /cases/new form and the createUserCase server action
-- both fail open (return reason:'not_ready'), the "+ Create your own case"
-- button still renders but submissions land on an error toast. No
-- crash path.
--
-- Cohort-content protection: every existing case in production was
-- ingested by the admin pipeline (source = casebook URL / school name)
-- and has user_id = NULL. We add a boolean discriminator `is_user_case`
-- so the cohort /cases listing can cheaply filter user submissions OUT,
-- preserving the curated-cases-only moat. RLS additionally enforces
-- visibility: a user can only ever see their own user cases (plus all
-- cohort cases as before).
--
-- Idempotent on re-paste (default-with-IF-NOT-EXISTS pattern).

-- Columns -------------------------------------------------------------

alter table cases
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table cases
  add column if not exists is_user_case boolean not null default false;

-- Hot index for the "my cases" listing query
-- (where is_user_case = true and user_id = auth.uid()).
create index if not exists cases_user_id_idx on cases (user_id)
  where is_user_case = true;

-- RLS -----------------------------------------------------------------
-- Replace the existing read-all policy with a discriminated one so a
-- user can read cohort cases AND their own user cases, but NEVER
-- another user's user cases. Cohort cases stay world-readable (to
-- authenticated users) — same posture as today.

drop policy if exists "cases_read_authenticated" on cases;

create policy "cases_read_cohort_or_own_user_case"
  on cases for select
  to authenticated
  using (
    is_user_case = false
    or (is_user_case = true and user_id = auth.uid())
  );

-- Insert: only as the authenticated owner, only marked as a user case.
drop policy if exists "cases_insert_own_user_case" on cases;
create policy "cases_insert_own_user_case"
  on cases for insert
  to authenticated
  with check (
    is_user_case = true
    and user_id = auth.uid()
  );

-- Update: only your own user cases. Cohort cases (is_user_case=false)
-- remain service-role-only by deliberate omission of an UPDATE policy
-- with a permissive `using` clause — Postgres denies by default.
drop policy if exists "cases_update_own_user_case" on cases;
create policy "cases_update_own_user_case"
  on cases for update
  to authenticated
  using (is_user_case = true and user_id = auth.uid())
  with check (is_user_case = true and user_id = auth.uid());

-- Delete: only your own user cases.
drop policy if exists "cases_delete_own_user_case" on cases;
create policy "cases_delete_own_user_case"
  on cases for delete
  to authenticated
  using (is_user_case = true and user_id = auth.uid());
