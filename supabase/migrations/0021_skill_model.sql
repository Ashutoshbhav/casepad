-- 0021_skill_model.sql
-- PRD v3.1 Stage 1 — the per-skill learner model ("the Twin").
--
-- After a session is scored, src/lib/skills/apply.ts runs one LLM
-- knowledge-tracing pass over the transcript (src/lib/skills/knowledge-tracing.ts),
-- turns each observation into a Glicko-2 match (src/lib/skills/glicko2.ts), and
-- updates the candidate's rating on that micro-skill (src/lib/skills/taxonomy.ts).
--
--   skill_obs   — append-only evidence log, one row per (session, skill)
--   skill_state — current Glicko-2 rating per (user, skill); the twin itself
--
-- NOTE: this repo has NO migration runner — apply via `supabase migration up`
-- once the CLI is linked, or paste into the Supabase Studio SQL editor.
-- Safe/idempotent to re-run.

create table if not exists skill_obs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid references sessions(id) on delete set null,
  skill_id      text not null,
  demonstrated  boolean not null default true,
  quality       real not null,        -- 0..1
  difficulty    real not null,        -- 0..1 (case difficulty for this skill)
  confidence    real not null,        -- 0..1 (tracer confidence)
  evidence      text,
  created_at    timestamptz not null default now()
);
create index if not exists skill_obs_user_idx        on skill_obs (user_id);
create index if not exists skill_obs_user_skill_idx  on skill_obs (user_id, skill_id);
create index if not exists skill_obs_session_idx     on skill_obs (session_id);
-- one row per (session, skill): re-evaluating a session replaces, not appends
create unique index if not exists skill_obs_session_skill_uniq
  on skill_obs (session_id, skill_id) where session_id is not null;

create table if not exists skill_state (
  user_id     uuid not null references auth.users(id) on delete cascade,
  skill_id    text not null,
  rating      real not null default 1500,
  rd          real not null default 350,
  vol         real not null default 0.06,
  obs_count   integer not null default 0,
  last_obs_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, skill_id)
);
create index if not exists skill_state_user_idx on skill_state (user_id);

alter table skill_obs   enable row level security;
alter table skill_state enable row level security;

-- A user can read and write only their own rows. The tracing pass runs
-- server-side with the user-scoped client, so these policies are the path it
-- actually uses; the service-role client bypasses RLS as a fallback.
do $$ begin
  create policy "skill_obs_rw_own" on skill_obs
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "skill_state_rw_own" on skill_state
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Quick look for Ash:
--   select skill_id, round(rating) r, round(rd) rd, obs_count
--   from skill_state where user_id = '<uid>' order by rating desc;
