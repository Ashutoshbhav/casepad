-- 0018_llm_usage.sql — global + per-user daily LLM usage caps (public-launch
-- circuit breaker). Mirrors the tavily_quota pattern but with a race-safe
-- atomic increment so a flood of concurrent public users can't blow past the
-- ceiling. Counts chat turns (the dominant LLM-cost vector).
--
-- Apply in Supabase Studio (SQL editor). Until applied, the bump_llm_usage RPC
-- 404s and src/lib/usage/llm-budget.ts fails OPEN — so app behavior is unchanged
-- until this runs; running it ACTIVATES the cap.

create table if not exists public.llm_usage (
  scope     text    not null,            -- 'global' | 'user'
  scope_key text    not null,            -- 'all' for global, the user_id for per-user
  day       date    not null,            -- UTC day bucket
  count     integer not null default 0,
  primary key (scope, scope_key, day)
);

-- Only the service role (admin client) ever touches this. RLS on with NO policy
-- => denied to anon/authenticated; the service role bypasses RLS. Keeps the
-- counter unreadable/untamperable by end users.
alter table public.llm_usage enable row level security;

-- Atomic bump: increments BOTH the global and the per-user daily rows in one
-- statement each and returns the new counts. SECURITY DEFINER so it runs with
-- the table owner's rights regardless of caller. Single round-trip from the app.
create or replace function public.bump_llm_usage(p_user text, p_day date, p_n integer)
returns table (global_count integer, user_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  g integer;
  u integer;
begin
  insert into public.llm_usage (scope, scope_key, day, count)
    values ('global', 'all', p_day, p_n)
    on conflict (scope, scope_key, day)
      do update set count = public.llm_usage.count + p_n
    returning count into g;

  insert into public.llm_usage (scope, scope_key, day, count)
    values ('user', p_user, p_day, p_n)
    on conflict (scope, scope_key, day)
      do update set count = public.llm_usage.count + p_n
    returning count into u;

  return query select g, u;
end;
$$;
