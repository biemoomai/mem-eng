-- Mem-eng release hardening: FSRS persistence, quota, and storage ownership

alter table public.user_decks add column if not exists scheduled_days integer not null default 0;
alter table public.user_decks add column if not exists elapsed_days integer not null default 0;
alter table public.user_decks add column if not exists learning_steps integer not null default 0;
alter table public.user_decks add column if not exists last_review_date timestamptz;
alter table public.user_decks add column if not exists mastered_at timestamptz;

-- Cards are private to their owner. This replaces the incomplete original policy.
drop policy if exists "Users control their own decks" on public.user_decks;
create policy "Users control their own decks"
  on public.user_decks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Global dictionary stays readable in the app; only server-side functions may write it.
drop policy if exists "Authenticated users can cache new words" on public.global_dictionary;

create table if not exists public.word_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
alter table public.word_generation_usage enable row level security;

create or replace function public.consume_word_generation_quota(p_user_id uuid, p_is_anonymous boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := case when p_is_anonymous then 10 else 60 end;
  v_count integer;
begin
  insert into public.word_generation_usage (user_id, usage_date, request_count, updated_at)
  values (p_user_id, current_date, 1, now())
  on conflict (user_id, usage_date) do update
    set request_count = public.word_generation_usage.request_count + 1,
        updated_at = now()
    where public.word_generation_usage.request_count < v_limit
  returning request_count into v_count;

  if v_count is null then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  return jsonb_build_object('allowed', true, 'remaining', greatest(0, v_limit - v_count));
end;
$$;
revoke all on function public.consume_word_generation_quota(uuid, boolean) from public, anon, authenticated;
grant execute on function public.consume_word_generation_quota(uuid, boolean) to service_role;

insert into storage.buckets (id, name, public)
values ('user-card-images', 'user-card-images', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their own card images" on storage.objects;
drop policy if exists "Users update their own card images" on storage.objects;
drop policy if exists "Users delete their own card images" on storage.objects;

create policy "Users upload their own card images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'user-card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update their own card images"
  on storage.objects for update to authenticated
  using (bucket_id = 'user-card-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their own card images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'user-card-images' and (storage.foldername(name))[1] = auth.uid()::text);