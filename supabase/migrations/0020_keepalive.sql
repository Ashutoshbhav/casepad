-- 0020_keepalive.sql
-- 2026-09-01 — real write target for the free-tier inactivity keep-alive.
--
-- Supabase free-tier pauses a project after 7 days of no activity. The daily
-- Vercel Cron + the 6-hourly GitHub Actions job both hit /api/admin/heartbeat,
-- which so far only *read* (auth.listUsers). This table gives that endpoint a
-- cheap, unambiguous WRITE to make on every run — a single upserted row whose
-- last_ping_at / ping_count move each time — so there is no question about
-- whether the traffic counts as activity, and `select * from keepalive` is a
-- one-line "when was this last kept awake, and by what" for debugging.
--
-- NOTE: this repo has NO migration runner — paste this into the Supabase
-- Studio SQL editor to apply. Safe/idempotent to re-run. The heartbeat route
-- degrades gracefully (reports "table missing") until this is applied.

create table if not exists keepalive (
  id           smallint primary key default 1,
  last_ping_at timestamptz not null default now(),
  ping_count   bigint      not null default 0,
  last_source  text,
  constraint keepalive_singleton check (id = 1)
);

insert into keepalive (id, last_ping_at, ping_count, last_source)
values (1, now(), 0, 'migration 0020')
on conflict (id) do nothing;

-- RLS ON with NO policies = deny-all to anon/authenticated. The heartbeat
-- route writes via the service-role client, which bypasses RLS. This is ops
-- plumbing; no client should ever read or write it.
alter table keepalive enable row level security;

-- Quick check for Ash:
--   select last_ping_at, ping_count, last_source,
--          now() - last_ping_at as since_last
--   from keepalive;
