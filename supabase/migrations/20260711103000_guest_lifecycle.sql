-- Mem-eng guest lifecycle: remove anonymous accounts inactive for 30 days.
-- App activity is tracked separately from the authentication sign-in timestamp.

alter table public.users
  add column if not exists last_active_at timestamptz not null default now();

create or replace function public.touch_user_activity()
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  touched_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.users set last_active_at = touched_at where id = auth.uid();
  return touched_at;
end;
$$;
revoke all on function public.touch_user_activity() from public, anon;
grant execute on function public.touch_user_activity() to authenticated;

create or replace function public.preview_anonymous_user_cleanup(p_limit integer default 100)
returns table(user_id uuid, last_active_at timestamptz)
language sql
security definer
set search_path = auth, public
as $$
  select auth_user.id,
         coalesce(profile.last_active_at, auth_user.last_sign_in_at, auth_user.created_at) as last_active_at
  from auth.users as auth_user
  left join public.users as profile on profile.id = auth_user.id
  where auth_user.is_anonymous = true
    and auth_user.email is null
    and coalesce(profile.last_active_at, auth_user.last_sign_in_at, auth_user.created_at) < now() - interval '30 days'
  order by coalesce(profile.last_active_at, auth_user.last_sign_in_at, auth_user.created_at)
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.preview_anonymous_user_cleanup(integer) from public, anon, authenticated;
grant execute on function public.preview_anonymous_user_cleanup(integer) to service_role;

create or replace function public.cleanup_anonymous_users(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = auth, public
as $$
declare deleted_count integer;
begin
  with candidates as (
    select user_id from public.preview_anonymous_user_cleanup(p_limit)
  )
  delete from auth.users as users_to_delete
  using candidates
  where users_to_delete.id = candidates.user_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.cleanup_anonymous_users(integer) from public, anon, authenticated;
grant execute on function public.cleanup_anonymous_users(integer) to service_role;

-- Schedule only after reviewing a dry run and deleting a known throwaway guest.
