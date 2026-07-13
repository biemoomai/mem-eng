-- Run bounded maintenance inside Postgres; no public cleanup endpoint is required.
create extension if not exists pg_cron;

select cron.schedule(
  'memeng-cleanup-anonymous-users',
  '17 2 * * *',
  $$ select public.cleanup_anonymous_users(100); $$
);

select cron.schedule(
  'memeng-cleanup-generation-usage',
  '41 2 * * *',
  $$ select public.cleanup_word_generation_usage(); $$
);
