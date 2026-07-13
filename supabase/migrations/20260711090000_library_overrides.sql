-- Mem-eng Library user overrides migration
-- Run this once in Supabase SQL Editor before enabling Library edits for logged-in users.

alter table public.user_decks
add column if not exists custom_word text,
add column if not exists custom_meaning jsonb,
add column if not exists custom_video_url text,
add column if not exists custom_notes text,
add column if not exists updated_at timestamp with time zone default now();

-- Optional storage setup for user-uploaded card images:
-- 1. Create a public Supabase Storage bucket named: user-card-images
-- 2. Keep file paths scoped like: {user_id}/{user_deck_id}/{timestamp}.webp
-- 3. The app stores the public URL in user_decks.custom_video_url.
