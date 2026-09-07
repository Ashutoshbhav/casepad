-- 0023_firm_profile.sql
-- "The Firm" (PRD v3.1 Stage 3) — the persistent career-sim wrapper.
--
-- One row per user: their rank on the consulting ladder (0-based index into
-- src/lib/firm/levels.ts LEVELS), total engagements completed, engagements
-- since the last promotion, and when they joined / were last promoted.
--
-- src/lib/firm/apply.ts bumps engagements_completed + engagements_at_level
-- after each scored session (best-effort, fortress-safe) and records a
-- promotion when the user acts on an eligible review.
--
-- NOTE: no migration runner — `supabase db push` (history is reconciled) or
-- paste into Studio. Idempotent.

create table if not exists firm_profile (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  level                  integer not null default 0,
  engagements_completed  integer not null default 0,
  engagements_at_level   integer not null default 0,
  joined_at              timestamptz not null default now(),
  last_promo_at          timestamptz,
  updated_at             timestamptz not null default now()
);

alter table firm_profile enable row level security;

-- Each user reads/writes only their own row. The post-session bump runs
-- server-side with the user-scoped client, so this policy is its path; the
-- service-role client bypasses RLS as a fallback.
do $$ begin
  create policy "firm_profile_rw_own" on firm_profile
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Quick look:
--   select level, engagements_completed, engagements_at_level, last_promo_at
--   from firm_profile where user_id = '<uid>';
