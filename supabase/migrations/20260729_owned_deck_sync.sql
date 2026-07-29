-- Return every card owned by the signed-in user, including dictionary entries
-- that are not yet public. The user cannot request another account's deck.
create or replace function public.get_my_deck_cards()
returns table (
  deck jsonb,
  dictionary jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(ud), to_jsonb(gd)
  from public.user_decks ud
  join public.global_dictionary gd on gd.id = ud.word_id
  where ud.user_id = auth.uid()
  order by ud.created_at asc;
$$;

revoke all on function public.get_my_deck_cards() from public, anon;
grant execute on function public.get_my_deck_cards() to authenticated;