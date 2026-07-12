-- Prevent browsers from poisoning the shared dictionary cache.
-- get-word-details is the only supported write path for server-generated entries.

alter table public.global_dictionary enable row level security;

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'global_dictionary'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.global_dictionary', policy_record.policyname);
  end loop;
end $$;

revoke insert, update, delete on public.global_dictionary from anon, authenticated;
grant select on public.global_dictionary to anon, authenticated;

drop policy if exists "App can read verified dictionary entries" on public.global_dictionary;
create policy "App can read verified dictionary entries"
  on public.global_dictionary for select to anon, authenticated
  using (true);
