-- 0016_nsm_failures.sql
-- C4 (2026-06-02) — production failure telemetry table.
-- Backs src/lib/observability/log-failure.ts. Records NSM-fatal failures so
-- backend health is queryable instead of buried in ephemeral Vercel logs.
--
-- NOTE: this repo has NO migration runner — paste this into the Supabase
-- Studio SQL editor to apply. Safe/idempotent to re-run.

create table if not exists nsm_failures (
  id          uuid primary key default gen_random_uuid(),
  route       text not null,
  session_id  text,
  user_id     uuid,
  error       text,
  detail      text,
  created_at  timestamptz not null default now()
);

-- RLS ON with NO policies = deny-all to anon/authenticated. The logFailure
-- helper writes via the service-role client, which bypasses RLS. Failures are
-- ops data; clients should never read or write this table.
alter table nsm_failures enable row level security;

create index if not exists nsm_failures_created_at_idx on nsm_failures (created_at desc);
create index if not exists nsm_failures_route_idx     on nsm_failures (route);

-- Quick health query for Ash:
--   select route, count(*), max(created_at)
--   from nsm_failures
--   where created_at > now() - interval '24 hours'
--   group by route order by 2 desc;
