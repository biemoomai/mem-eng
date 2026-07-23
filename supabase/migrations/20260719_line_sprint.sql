-- Mem-eng LINE sprint: durable LINE identities and webhook idempotency.

alter table public.users add column if not exists line_user_id text;
create unique index if not exists users_line_user_id_unique_idx
  on public.users (line_user_id)
  where line_user_id is not null;

create table if not exists public.line_identities (
  line_user_id text primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text,
  picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.line_identities enable row level security;

create index if not exists idx_line_identities_user_id
  on public.line_identities (user_id);

create table if not exists public.line_webhook_events (
  webhook_event_id text primary key,
  line_user_id text,
  event_type text,
  status text not null default 'processing'
    check (status in ('processing', 'completed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.line_webhook_events enable row level security;

create index if not exists idx_line_webhook_events_created_at
  on public.line_webhook_events (created_at);

create or replace function public.cleanup_line_webhook_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.line_webhook_events
  where created_at < now() - interval '14 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_line_webhook_events() from public, anon, authenticated;
grant execute on function public.cleanup_line_webhook_events() to service_role;

-- Trust only server-owned identity records. Legacy rows are migrated only
-- when the Auth email proves that the account was created for this LINE ID.
insert into public.line_identities (
  line_user_id,
  user_id,
  display_name,
  created_at,
  updated_at,
  last_seen_at
)
select
  lower(u.line_user_id),
  u.id,
  u.display_name,
  coalesce(u.created_at, now()),
  now(),
  now()
from public.users u
join auth.users au on au.id = u.id
where u.line_user_id ~* '^U[0-9a-f]{32}$'
  and lower(au.email) = lower(u.line_user_id) || '@line.guest.com'
on conflict do nothing;

update auth.users au
set raw_app_meta_data =
  coalesce(au.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'line_user_id', li.line_user_id,
    'auth_origin', 'line'
  )
from public.line_identities li
where li.user_id = au.id
  and coalesce(au.raw_app_meta_data ->> 'line_user_id', '') <> li.line_user_id;

update public.users u
set line_user_id = null
where u.line_user_id is not null
  and not exists (
    select 1
    from public.line_identities li
    where li.user_id = u.id
      and li.line_user_id = lower(u.line_user_id)
  );

create or replace function public.protect_line_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    if TG_OP = 'INSERT' and new.line_user_id is not null then
      raise exception 'line_user_id is server managed';
    end if;
    if TG_OP = 'UPDATE' and new.line_user_id is distinct from old.line_user_id then
      raise exception 'line_user_id is server managed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_line_user_id_insert_trigger on public.users;
create trigger protect_line_user_id_insert_trigger
before insert on public.users
for each row execute function public.protect_line_user_id();

drop trigger if exists protect_line_user_id_trigger on public.users;
create trigger protect_line_user_id_trigger
before update of line_user_id on public.users
for each row execute function public.protect_line_user_id();

revoke all on function public.protect_line_user_id() from public, anon, authenticated;

alter table public.line_webhook_events
  add column if not exists claimed_at timestamptz default now(),
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_error text;

update public.line_webhook_events
set claimed_at = coalesce(claimed_at, created_at)
where claimed_at is null;

alter table public.line_webhook_events
  alter column claimed_at set default now(),
  alter column claimed_at set not null;

create or replace function public.claim_line_webhook_event(
  p_webhook_event_id text,
  p_line_user_id text,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if p_webhook_event_id is null
    or length(p_webhook_event_id) < 1
    or length(p_webhook_event_id) > 160
  then
    raise exception 'Invalid webhook event ID';
  end if;

  delete from public.line_webhook_events
  where
    (status = 'completed' and created_at < now() - interval '30 days')
    or
    (status = 'processing' and claimed_at < now() - interval '7 days');

  insert into public.line_webhook_events (
    webhook_event_id,
    line_user_id,
    event_type,
    status,
    claimed_at,
    attempt_count
  )
  values (
    p_webhook_event_id,
    p_line_user_id,
    coalesce(nullif(p_event_type, ''), 'unknown'),
    'processing',
    now(),
    1
  )
  on conflict do nothing;

  get diagnostics affected = row_count;
  if affected = 1 then
    return true;
  end if;

  update public.line_webhook_events
  set
    line_user_id = coalesce(p_line_user_id, line_user_id),
    event_type = coalesce(nullif(p_event_type, ''), event_type),
    claimed_at = now(),
    attempt_count = attempt_count + 1,
    last_error = null
  where webhook_event_id = p_webhook_event_id
    and status = 'processing'
    and claimed_at < now() - interval '2 minutes';

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.claim_line_webhook_event(text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_line_webhook_event(text, text, text)
  to service_role;

create table if not exists public.line_auth_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.line_auth_rate_limits enable row level security;

create or replace function public.consume_line_auth_quota(
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
  window_size interval;
begin
  if p_key_hash is null
    or length(p_key_hash) <> 64
    or p_window_seconds < 60
    or p_limit < 1
  then
    return false;
  end if;

  window_size := make_interval(secs => p_window_seconds);

  delete from public.line_auth_rate_limits
  where updated_at < now() - interval '2 days';

  insert into public.line_auth_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update
  set
    request_count = case
      when public.line_auth_rate_limits.window_started_at <= now() - window_size
        then 1
      else public.line_auth_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.line_auth_rate_limits.window_started_at <= now() - window_size
        then now()
      else public.line_auth_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count <= p_limit into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_line_auth_quota(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_line_auth_quota(text, integer, integer)
  to service_role;

create table if not exists public.line_private_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  normalized_word text not null,
  rich_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_word)
);

alter table public.line_private_cards enable row level security;

create or replace function public.save_private_word_to_deck(
  p_word text,
  p_details jsonb,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  existing_deck_id uuid;
  placeholder_id uuid := gen_random_uuid();
  deck_id uuid;
  normalized_word text;
  word_pos text;
  word_cefr text;
  image_url text;
begin
  target_user_id := case
    when auth.role() = 'service_role' then p_user_id
    else auth.uid()
  end;

  if target_user_id is null
    or (auth.role() <> 'service_role' and p_user_id is not null and p_user_id <> auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  normalized_word := lower(trim(coalesce(p_word, '')));
  if length(normalized_word) < 1 or length(normalized_word) > 80 then
    raise exception 'Invalid private word';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'Invalid private card details';
  end if;
  if octet_length(p_details::text) > 32768 then
    raise exception 'Private card details are too large';
  end if;

  select ud.id into existing_deck_id
  from public.user_decks ud
  where ud.user_id = target_user_id
    and lower(coalesce(ud.custom_word, '')) = normalized_word
  limit 1;

  if existing_deck_id is not null then
    return existing_deck_id;
  end if;

  if (
    select count(*)
    from public.user_decks ud
    join public.global_dictionary gd on gd.id = ud.word_id
    where ud.user_id = target_user_id
      and gd.word like '__private__%'
  ) >= 500 then
    raise exception 'Private card limit reached';
  end if;

  word_pos := left(coalesce(nullif(p_details ->> 'pos', ''), 'word'), 32);
  word_cefr := upper(coalesce(nullif(p_details ->> 'cefrLevel', ''), 'Unranked'));
  if word_cefr not in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'UNRANKED') then
    word_cefr := 'UNRANKED';
  end if;
  image_url := nullif(p_details #>> '{savedSceneImages,0}', '');

  insert into public.global_dictionary (
    id,
    word,
    pos,
    meaning,
    rich_data,
    cefr_level
  )
  values (
    placeholder_id,
    '__private__' || replace(placeholder_id::text, '-', ''),
    word_pos,
    'Private user card',
    jsonb_build_object('private', true),
    initcap(lower(word_cefr))
  );

  insert into public.user_decks (
    user_id,
    word_id,
    srs_level,
    next_review_date,
    custom_word,
    custom_meaning,
    custom_video_url
  )
  values (
    target_user_id,
    placeholder_id,
    'Learning',
    now(),
    normalized_word,
    p_details || jsonb_build_object('_forcedOriginal', true),
    image_url
  )
  returning id into deck_id;

  return deck_id;
end;
$$;

revoke all on function public.save_private_word_to_deck(text, jsonb, uuid)
  from public, anon;
grant execute on function public.save_private_word_to_deck(text, jsonb, uuid)
  to authenticated, service_role;

create or replace function public.cleanup_private_dictionary_placeholder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.custom_word is not null then
    delete from public.global_dictionary gd
    where gd.id = old.word_id
      and gd.word like '__private__%'
      and not exists (
        select 1 from public.user_decks ud where ud.word_id = old.word_id
      );
  end if;
  return old;
end;
$$;

drop trigger if exists cleanup_private_dictionary_placeholder_trigger
  on public.user_decks;
create trigger cleanup_private_dictionary_placeholder_trigger
after delete on public.user_decks
for each row execute function public.cleanup_private_dictionary_placeholder();

revoke all on function public.cleanup_private_dictionary_placeholder()
  from public, anon, authenticated;

create or replace function public.get_user_cefr_stats(
  p_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  result jsonb;
begin
  target_user_id := case
    when auth.role() = 'service_role' then p_user_id
    else auth.uid()
  end;

  if target_user_id is null
    or (auth.role() <> 'service_role' and p_user_id is not null and p_user_id <> auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'A1', count(*) filter (where upper(gd.cefr_level) = 'A1'),
    'A2', count(*) filter (where upper(gd.cefr_level) = 'A2'),
    'B1', count(*) filter (where upper(gd.cefr_level) = 'B1'),
    'B2', count(*) filter (where upper(gd.cefr_level) = 'B2'),
    'C1', count(*) filter (where upper(gd.cefr_level) = 'C1'),
    'C2', count(*) filter (where upper(gd.cefr_level) = 'C2')
  )
  into result
  from public.user_decks ud
  join public.global_dictionary gd on gd.id = ud.word_id
  where ud.user_id = target_user_id;

  return coalesce(
    result,
    jsonb_build_object(
      'total', 0,
      'A1', 0, 'A2', 0, 'B1', 0,
      'B2', 0, 'C1', 0, 'C2', 0
    )
  );
end;
$$;

revoke all on function public.get_user_cefr_stats(uuid) from public, anon;
grant execute on function public.get_user_cefr_stats(uuid)
  to authenticated, service_role;
