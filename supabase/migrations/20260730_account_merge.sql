-- Secure one-time account merge for LINE -> Google consolidation.

create table if not exists public.account_merge_intents (
  token_hash text primary key,
  source_user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.account_merge_intents enable row level security;

create index if not exists account_merge_intents_expires_idx
  on public.account_merge_intents (expires_at);

create table if not exists public.account_merge_audit (
  id uuid primary key default gen_random_uuid(),
  source_user_id uuid not null,
  destination_user_id uuid not null,
  source_deck_count integer not null default 0,
  destination_deck_count_before integer not null default 0,
  destination_deck_count_after integer not null default 0,
  overlap_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.account_merge_audit enable row level security;

create or replace function public.merge_memeng_accounts(
  p_source_user_id uuid,
  p_destination_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_deck_count integer := 0;
  destination_before integer := 0;
  destination_after integer := 0;
  overlap_count integer := 0;
  source_profile public.users%rowtype;
  destination_profile public.users%rowtype;
  source_line_id text;
  source_row record;
  destination_row record;
  source_rank timestamptz;
  destination_rank timestamptz;
  keep_source_schedule boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  if p_source_user_id is null
    or p_destination_user_id is null
    or p_source_user_id = p_destination_user_id
  then
    raise exception 'Invalid merge accounts';
  end if;

  select * into source_profile
  from public.users
  where id = p_source_user_id
  for update;

  select * into destination_profile
  from public.users
  where id = p_destination_user_id
  for update;

  if source_profile.id is null or destination_profile.id is null then
    raise exception 'Merge account was not found';
  end if;

  select li.line_user_id into source_line_id
  from public.line_identities li
  where li.user_id = p_source_user_id
  for update;

  if source_line_id is null then
    raise exception 'Source account is not a LINE account';
  end if;

  if exists (
    select 1
    from public.line_identities li
    where li.user_id = p_destination_user_id
      and li.line_user_id <> source_line_id
  ) then
    raise exception 'Destination already has another LINE account';
  end if;

  select count(*) into source_deck_count
  from public.user_decks
  where user_id = p_source_user_id;

  select count(*) into destination_before
  from public.user_decks
  where user_id = p_destination_user_id;

  for source_row in
    select
      ud.*,
      lower(trim(coalesce(nullif(ud.custom_word, ''), gd.word))) as normalized_word
    from public.user_decks ud
    join public.global_dictionary gd on gd.id = ud.word_id
    where ud.user_id = p_source_user_id
    order by ud.created_at, ud.id
  loop
    destination_row := null;

    select
      ud.*,
      lower(trim(coalesce(nullif(ud.custom_word, ''), gd.word))) as normalized_word
    into destination_row
    from public.user_decks ud
    join public.global_dictionary gd on gd.id = ud.word_id
    where ud.user_id = p_destination_user_id
      and (
        ud.word_id = source_row.word_id
        or lower(trim(coalesce(nullif(ud.custom_word, ''), gd.word))) =
           source_row.normalized_word
      )
    order by
      case when ud.word_id = source_row.word_id then 0 else 1 end,
      ud.created_at
    limit 1
    for update of ud;

    if destination_row.id is null then
      update public.user_decks
      set user_id = p_destination_user_id
      where id = source_row.id;
      continue;
    end if;

    overlap_count := overlap_count + 1;
    source_rank := coalesce(
      source_row.mastered_at,
      source_row.last_review_date,
      source_row.updated_at,
      source_row.created_at
    );
    destination_rank := coalesce(
      destination_row.mastered_at,
      destination_row.last_review_date,
      destination_row.updated_at,
      destination_row.created_at
    );
    keep_source_schedule :=
      (source_row.mastered_at is not null and destination_row.mastered_at is null)
      or (
        (source_row.mastered_at is null) =
        (destination_row.mastered_at is null)
        and source_rank > destination_rank
      );

    update public.user_decks
    set
      srs_level = case
        when source_row.mastered_at is not null
          or destination_row.mastered_at is not null
          then 'Mastered'
        when keep_source_schedule then source_row.srs_level
        else destination_row.srs_level
      end,
      repetition = greatest(
        coalesce(destination_row.repetition, 0),
        coalesce(source_row.repetition, 0)
      ),
      interval = case when keep_source_schedule
        then source_row.interval else destination_row.interval end,
      ease_factor = case when keep_source_schedule
        then source_row.ease_factor else destination_row.ease_factor end,
      next_review_date = case
        when source_row.mastered_at is not null
          or destination_row.mastered_at is not null then null
        when keep_source_schedule then source_row.next_review_date
        else destination_row.next_review_date
      end,
      stability = case when keep_source_schedule
        then source_row.stability else destination_row.stability end,
      difficulty = case when keep_source_schedule
        then source_row.difficulty else destination_row.difficulty end,
      reps = greatest(
        coalesce(destination_row.reps, 0),
        coalesce(source_row.reps, 0)
      ),
      lapses = greatest(
        coalesce(destination_row.lapses, 0),
        coalesce(source_row.lapses, 0)
      ),
      state = case when keep_source_schedule
        then source_row.state else destination_row.state end,
      scheduled_days = case when keep_source_schedule
        then source_row.scheduled_days else destination_row.scheduled_days end,
      elapsed_days = case when keep_source_schedule
        then source_row.elapsed_days else destination_row.elapsed_days end,
      learning_steps = case when keep_source_schedule
        then source_row.learning_steps else destination_row.learning_steps end,
      last_review_date = coalesce(
        greatest(destination_row.last_review_date, source_row.last_review_date),
        destination_row.last_review_date,
        source_row.last_review_date
      ),
      mastered_at = coalesce(
        least(destination_row.mastered_at, source_row.mastered_at),
        destination_row.mastered_at,
        source_row.mastered_at
      ),
      custom_word = coalesce(
        nullif(destination_row.custom_word, ''),
        nullif(source_row.custom_word, '')
      ),
      custom_meaning = coalesce(
        destination_row.custom_meaning,
        source_row.custom_meaning
      ),
      custom_video_url = coalesce(
        nullif(destination_row.custom_video_url, ''),
        nullif(source_row.custom_video_url, '')
      ),
      custom_notes = coalesce(
        nullif(destination_row.custom_notes, ''),
        nullif(source_row.custom_notes, '')
      ),
      created_at = least(destination_row.created_at, source_row.created_at),
      updated_at = greatest(
        destination_row.updated_at,
        source_row.updated_at,
        now()
      )
    where id = destination_row.id;

    delete from public.user_decks where id = source_row.id;
  end loop;

  update public.user_review_logs
  set user_id = p_destination_user_id
  where user_id = p_source_user_id;

  insert into public.line_private_cards (
    user_id,
    normalized_word,
    rich_data,
    created_at,
    updated_at
  )
  select
    p_destination_user_id,
    normalized_word,
    rich_data,
    created_at,
    updated_at
  from public.line_private_cards
  where user_id = p_source_user_id
  on conflict (user_id, normalized_word) do update
  set
    rich_data = case
      when excluded.updated_at > public.line_private_cards.updated_at
        then excluded.rich_data
      else public.line_private_cards.rich_data
    end,
    created_at = least(
      public.line_private_cards.created_at,
      excluded.created_at
    ),
    updated_at = greatest(
      public.line_private_cards.updated_at,
      excluded.updated_at
    );

  delete from public.line_private_cards
  where user_id = p_source_user_id;

  update public.users
  set
    xp = greatest(coalesce(destination_profile.xp, 0), coalesce(source_profile.xp, 0)),
    streak_days = greatest(
      coalesce(destination_profile.streak_days, 0),
      coalesce(source_profile.streak_days, 0)
    ),
    daily_new_words_limit = greatest(
      coalesce(destination_profile.daily_new_words_limit, 0),
      coalesce(source_profile.daily_new_words_limit, 0)
    ),
    average_response_time_ms = case
      when coalesce(destination_profile.average_response_time_ms, 0) <= 0
        then source_profile.average_response_time_ms
      when coalesce(source_profile.average_response_time_ms, 0) <= 0
        then destination_profile.average_response_time_ms
      else round(
        (
          destination_profile.average_response_time_ms +
          source_profile.average_response_time_ms
        ) / 2.0
      )::integer
    end,
    line_user_id = source_line_id,
    last_login_date = greatest(
      destination_profile.last_login_date,
      source_profile.last_login_date
    )
  where id = p_destination_user_id;

  update public.line_identities
  set
    user_id = p_destination_user_id,
    updated_at = now(),
    last_seen_at = now()
  where line_user_id = source_line_id;

  select count(*) into destination_after
  from public.user_decks
  where user_id = p_destination_user_id;

  insert into public.account_merge_audit (
    source_user_id,
    destination_user_id,
    source_deck_count,
    destination_deck_count_before,
    destination_deck_count_after,
    overlap_count
  )
  values (
    p_source_user_id,
    p_destination_user_id,
    source_deck_count,
    destination_before,
    destination_after,
    overlap_count
  );

  return jsonb_build_object(
    'sourceDeckCount', source_deck_count,
    'destinationDeckCountBefore', destination_before,
    'destinationDeckCountAfter', destination_after,
    'overlapCount', overlap_count
  );
end;
$$;

revoke all on function public.merge_memeng_accounts(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.merge_memeng_accounts(uuid, uuid)
  to service_role;
