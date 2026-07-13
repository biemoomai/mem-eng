-- Add per-network and global circuit breakers to the per-user AI quota.
create table if not exists public.word_generation_ip_usage (
  client_hash text not null,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (client_hash, usage_date)
);
alter table public.word_generation_ip_usage enable row level security;

create table if not exists public.word_generation_global_usage (
  usage_date date primary key default current_date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.word_generation_global_usage enable row level security;

create or replace function public.consume_word_generation_quota(
  p_user_id uuid,
  p_is_anonymous boolean,
  p_client_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_limit integer := case when p_is_anonymous then 10 else 60 end;
  v_ip_limit integer := 120;
  v_global_limit integer := 500;
  v_user_count integer;
  v_ip_count integer;
  v_global_count integer;
begin
  if p_user_id is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'invalid_request');
  end if;

  insert into public.word_generation_usage (user_id, usage_date)
  values (p_user_id, current_date)
  on conflict (user_id, usage_date) do nothing;
  insert into public.word_generation_ip_usage (client_hash, usage_date)
  values (p_client_hash, current_date)
  on conflict (client_hash, usage_date) do nothing;
  insert into public.word_generation_global_usage (usage_date)
  values (current_date)
  on conflict (usage_date) do nothing;

  select request_count into v_user_count
  from public.word_generation_usage
  where user_id = p_user_id and usage_date = current_date
  for update;
  select request_count into v_ip_count
  from public.word_generation_ip_usage
  where client_hash = p_client_hash and usage_date = current_date
  for update;
  select request_count into v_global_count
  from public.word_generation_global_usage
  where usage_date = current_date
  for update;

  if v_user_count >= v_user_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'user_limit');
  end if;
  if v_ip_count >= v_ip_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'network_limit');
  end if;
  if v_global_count >= v_global_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'service_limit');
  end if;

  update public.word_generation_usage
  set request_count = request_count + 1, updated_at = now()
  where user_id = p_user_id and usage_date = current_date;
  update public.word_generation_ip_usage
  set request_count = request_count + 1, updated_at = now()
  where client_hash = p_client_hash and usage_date = current_date;
  update public.word_generation_global_usage
  set request_count = request_count + 1, updated_at = now()
  where usage_date = current_date;

  return jsonb_build_object(
    'allowed', true,
    'remaining', least(v_user_limit - v_user_count - 1, v_ip_limit - v_ip_count - 1),
    'serviceRemaining', v_global_limit - v_global_count - 1
  );
end;
$$;

revoke all on function public.consume_word_generation_quota(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.consume_word_generation_quota(uuid, boolean, text) to service_role;

create or replace function public.cleanup_word_generation_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  current_deleted integer;
begin
  delete from public.word_generation_usage where usage_date < current_date - 45;
  get diagnostics deleted_count = row_count;
  delete from public.word_generation_ip_usage where usage_date < current_date - 45;
  get diagnostics current_deleted = row_count;
  deleted_count := deleted_count + current_deleted;
  delete from public.word_generation_global_usage where usage_date < current_date - 45;
  get diagnostics current_deleted = row_count;
  return deleted_count + current_deleted;
end;
$$;

revoke all on function public.cleanup_word_generation_usage() from public, anon, authenticated;
grant execute on function public.cleanup_word_generation_usage() to service_role;
