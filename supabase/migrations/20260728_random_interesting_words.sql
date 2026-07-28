-- A small randomized discovery set from the shared dictionary.
-- The client excludes the learner's own deck and recently shown words.
create or replace function public.get_random_interesting_words(
  p_exclude_words text[] default array[]::text[],
  p_limit integer default 3
)
returns table (
  word text,
  pos text,
  cefr_level text,
  meaning text,
  rich_data jsonb
)
language sql
security invoker
set search_path = public
as $$
  select gd.word, gd.pos, gd.cefr_level, gd.meaning, gd.rich_data
  from public.global_dictionary gd
  where coalesce(trim(gd.word), '') <> ''
    and gd.rich_data is not null
    and lower(gd.word) <> all(
      coalesce(
        array(
          select lower(trim(candidate))
          from unnest(p_exclude_words) as candidate
          where trim(candidate) <> ''
        ),
        array[]::text[]
      )
    )
  order by random()
  limit least(greatest(p_limit, 1), 5);
$$;

grant execute on function public.get_random_interesting_words(text[], integer) to anon, authenticated;