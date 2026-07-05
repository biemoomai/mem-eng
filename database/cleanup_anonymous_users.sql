-- Mem-eng: Cleanup Anonymous Guest Users older than 30 days
-- Run this in the Supabase SQL Editor.
-- Note: Foreign key cascades (ON DELETE CASCADE) will automatically wipe their entries in public.users, public.user_decks, and public.user_review_logs.

CREATE OR REPLACE FUNCTION public.cleanup_anonymous_users()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Perform delete on auth.users for accounts that are anonymous, lack contact details, and are older than 30 days
  DELETE FROM auth.users
  WHERE 
    (is_anonymous = true OR raw_app_meta_data->>'provider' = 'anonymous')
    AND email IS NULL
    AND phone IS NULL
    AND created_at < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % anonymous guest users older than 30 days.', deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To test manually, run:
-- SELECT public.cleanup_anonymous_users();

-- Optional: Schedule daily cleanup using Supabase pg_cron (if enabled)
-- select cron.schedule(
--   'cleanup-anonymous-users-daily',
--   '0 0 * * *',
--   $$ select public.cleanup_anonymous_users(); $$
-- );
