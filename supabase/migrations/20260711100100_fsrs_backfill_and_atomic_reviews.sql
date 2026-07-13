-- Preserve legacy maturity when the new FSRS persistence fields are introduced.
with legacy as (
  select
    id,
    greatest(coalesce(interval, 0), 0) as inferred_scheduled_days,
    coalesce(
      last_review_date,
      case
        when next_review_date is not null and coalesce(interval, 0) > 0
          then next_review_date - make_interval(days => greatest(interval, 0))
        else created_at
      end
    ) as inferred_last_review
  from public.user_decks
)
update public.user_decks as decks
set scheduled_days = case
      when decks.scheduled_days = 0 then legacy.inferred_scheduled_days
      else decks.scheduled_days
    end,
    last_review_date = legacy.inferred_last_review,
    elapsed_days = case
      when decks.elapsed_days = 0 and legacy.inferred_last_review is not null
        then greatest(0, floor(extract(epoch from (now() - legacy.inferred_last_review)) / 86400)::integer)
      else decks.elapsed_days
    end
from legacy
where decks.id = legacy.id
  and (
    decks.scheduled_days = 0
    or decks.elapsed_days = 0
    or decks.last_review_date is null
  );

-- Update the deck schedule and append its review log in one transaction.
create or replace function public.record_fsrs_review(
  p_deck_id uuid,
  p_srs_level text,
  p_repetition integer,
  p_interval integer,
  p_ease_factor real,
  p_next_review_date timestamptz,
  p_stability double precision,
  p_difficulty double precision,
  p_reps integer,
  p_lapses integer,
  p_state integer,
  p_scheduled_days integer,
  p_elapsed_days integer,
  p_learning_steps integer,
  p_last_review_date timestamptz,
  p_word text,
  p_rating text,
  p_response_time_ms integer,
  p_stability_before double precision,
  p_stability_after double precision
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_rating not in ('again', 'hard', 'normal', 'easy') then
    raise exception 'Invalid FSRS rating';
  end if;
  if p_word is null or length(trim(p_word)) = 0 or length(p_word) > 80 then
    raise exception 'Invalid review word';
  end if;

  update public.user_decks
  set srs_level = p_srs_level,
      repetition = greatest(coalesce(p_repetition, 0), 0),
      interval = greatest(coalesce(p_interval, 0), 0),
      ease_factor = p_ease_factor,
      next_review_date = p_next_review_date,
      stability = p_stability,
      difficulty = p_difficulty,
      reps = greatest(coalesce(p_reps, 0), 0),
      lapses = greatest(coalesce(p_lapses, 0), 0),
      state = p_state,
      scheduled_days = greatest(coalesce(p_scheduled_days, 0), 0),
      elapsed_days = greatest(coalesce(p_elapsed_days, 0), 0),
      learning_steps = greatest(coalesce(p_learning_steps, 0), 0),
      last_review_date = p_last_review_date,
      updated_at = now()
  where id = p_deck_id
    and user_id = auth.uid();

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'Deck card not found or not owned by caller';
  end if;

  insert into public.user_review_logs (
    user_id,
    word,
    rating,
    response_time_ms,
    stability_before,
    stability_after,
    review_date
  ) values (
    auth.uid(),
    trim(p_word),
    p_rating,
    greatest(coalesce(p_response_time_ms, 0), 0),
    coalesce(p_stability_before, 0),
    coalesce(p_stability_after, 0),
    now()
  );
end;
$$;

revoke all on function public.record_fsrs_review(
  uuid, text, integer, integer, real, timestamptz, double precision,
  double precision, integer, integer, integer, integer, integer, integer,
  timestamptz, text, text, integer, double precision, double precision
) from public, anon;
grant execute on function public.record_fsrs_review(
  uuid, text, integer, integer, real, timestamptz, double precision,
  double precision, integer, integer, integer, integer, integer, integer,
  timestamptz, text, text, integer, double precision, double precision
) to authenticated;
