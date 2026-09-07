-- 0024_case_calibration.sql
-- PRD v3.1 Stage 4 — empirical case-difficulty calibration.
--
-- A side table, NOT a change to `cases`. Every completed session updates the
-- case's Elo-style difficulty rating (src/lib/calibration/case-elo.ts). An
-- admin reviews drift between this and the corpus easy/medium/hard label;
-- nothing here changes what users see automatically.
--
-- NOTE: `supabase db push` (history reconciled) or paste into Studio. Idempotent.

create table if not exists case_calibration (
  case_id     uuid primary key references cases(id) on delete cascade,
  rating      real not null default 1500,
  rd          real not null default 350,
  plays       integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table case_calibration enable row level security;

-- Read-only to authenticated (so a future "empirical difficulty" badge can
-- render); writes are service-role / the server-side post-session hook only.
do $$ begin
  create policy "case_calibration_read" on case_calibration
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Admin drift query:
--   select c.title, c.difficulty as label, round(cc.rating) as elo, cc.plays
--   from case_calibration cc join cases c on c.id = cc.case_id
--   where cc.plays >= 3 order by abs(cc.rating - 1520) desc;
