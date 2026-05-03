-- Device-cap enforcement: keep only the N most recent sessions per user;
-- delete the rest so older devices get booted on their next nav. The
-- direct-signin server action calls this RPC right after minting a new
-- session.
--
-- SECURITY DEFINER + grant to authenticated/service_role so PostgREST
-- can call it without exposing the entire auth schema.

create or replace function public.prune_user_sessions(p_user_id uuid, p_keep int default 2)
returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count int;
begin
  with ranked as (
    select id, row_number() over (partition by user_id order by created_at desc) as rn
    from auth.sessions
    where user_id = p_user_id
  ),
  to_delete as (
    select id from ranked where rn > p_keep
  )
  delete from auth.sessions
  where id in (select id from to_delete)
  returning 1
  into deleted_count;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.prune_user_sessions(uuid, int) from public;
grant execute on function public.prune_user_sessions(uuid, int) to service_role;
