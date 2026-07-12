-- Mem-eng guest lifecycle: remove anonymous accounts inactive for 30 days.
-- Run this migration in Supabase before enabling the scheduled cleanup.

create or replace function public.cleanup_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  deleted_count integer;
begin
  delete from auth.users
  where is_anonymous = true
    and coalesce(last_sign_in_at, created_at) < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_anonymous_users() from public, anon, authenticated;
grant execute on function public.cleanup_anonymous_users() to service_role;

-- Scheduling depends on the Supabase project's pg_cron setting. Configure the
-- daily job during deployment rather than silently creating a job in every DB:
-- select cron.schedule('memeng-cleanup-anonymous-users', '17 2 * * *',
--   $$ select public.cleanup_anonymous_users(); $$);
