-- supabase/migrations/0002_rls_policies.sql

alter table cases enable row level security;
alter table sessions enable row level security;
alter table cheat_sheets enable row level security;
alter table casebooks enable row level security;
alter table email_allowlist enable row level security;

-- Cases: any authenticated user can read; only service role writes (ingestion pipeline)
create policy "cases_read_authenticated"
  on cases for select
  to authenticated
  using (true);

-- Casebooks: any authenticated user can read
create policy "casebooks_read_authenticated"
  on casebooks for select
  to authenticated
  using (true);

-- Sessions: a user sees only their own sessions
create policy "sessions_select_own"
  on sessions for select
  to authenticated
  using (auth.uid() = user_id);
create policy "sessions_insert_own"
  on sessions for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "sessions_update_own"
  on sessions for update
  to authenticated
  using (auth.uid() = user_id);

-- Cheat sheets: only the session owner
create policy "cheat_sheets_select_own"
  on cheat_sheets for select
  to authenticated
  using (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  );
create policy "cheat_sheets_modify_own"
  on cheat_sheets for all
  to authenticated
  using (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  );

-- Email allowlist: RLS enabled with no policies = denied for anon/authenticated.
-- Only service role can read/write (used by /auth/callback).
