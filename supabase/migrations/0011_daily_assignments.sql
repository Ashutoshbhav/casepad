-- Stream 2 — Anticipation Hook: one named case "assigned" per user per day.
-- Surfaced as a top card on /dashboard. The picker is pure SQL/JS (no LLM)
-- and runs idempotently per (user_id, assigned_for) where assigned_for is
-- the IST calendar date.
--
-- Writes are done from server actions using the service-role client, so we
-- intentionally do NOT add insert/update RLS policies for authenticated users.
-- Authenticated users get owner-scoped read access only.

create table if not exists daily_assignments (
  user_id uuid references auth.users(id) on delete cascade not null,
  assigned_for date not null,
  case_id uuid references cases(id) on delete cascade not null,
  reason text not null,
  started_session_id uuid references sessions(id) on delete set null,
  created_at timestamptz default now(),
  primary key (user_id, assigned_for)
);

create index if not exists daily_assignments_user_idx
  on daily_assignments (user_id, assigned_for desc);

alter table daily_assignments enable row level security;

drop policy if exists "owner read" on daily_assignments;
create policy "owner read"
  on daily_assignments for select
  to authenticated
  using (auth.uid() = user_id);
