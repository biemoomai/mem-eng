-- ==========================================
-- Mem-eng Phase 3: Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ==========================================

-- Enable gen_random_uuid()
create extension if not exists "uuid-ossp";

-- 1. Create the Users Table
CREATE TABLE if not exists public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 1,
  daily_new_words_limit INTEGER DEFAULT 20,
  average_response_time_ms INTEGER DEFAULT 1500,
  last_login_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security (RLS) for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

create policy "Users can modify their own data" 
  on public.users for all 
  using (auth.uid() = id);


-- 2. Create the Global Dictionary Table (Gemini cached translations)
CREATE TABLE if not exists public.global_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  pos TEXT NOT NULL,
  meaning TEXT NOT NULL,          -- Legacy simple meaning text
  rich_data JSONB,                -- Advanced English explanation, collocation, scenes, and visual context
  cefr_level TEXT DEFAULT 'Unranked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Global Dictionary (Everyone can read, only authenticated can insert/update)
ALTER TABLE public.global_dictionary ENABLE ROW LEVEL SECURITY;

create policy "Anyone can read the dictionary" 
  on public.global_dictionary for select 
  using (true);

create policy "Authenticated users can cache new words" 
  on public.global_dictionary for insert 
  to authenticated
  with check (true);


-- 3. Create the User Decks (SRS Engine Table)
CREATE TABLE if not exists public.user_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  word_id UUID REFERENCES public.global_dictionary(id) ON DELETE CASCADE NOT NULL,
  
  -- SRS Math Fields (Backwards-compatibility & FSRS)
  srs_level TEXT DEFAULT 'Normal',
  repetition INTEGER DEFAULT 0,
  interval INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Advanced FSRS parameters
  stability DOUBLE PRECISION DEFAULT 0.1,
  difficulty DOUBLE PRECISION DEFAULT 3.0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent users from duplicating the same word in their deck
  UNIQUE(user_id, word_id) 
);

-- RLS for User Decks
ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

create policy "Users control their own decks" 
  on public.user_decks for all 
  using (auth.uid() = user_id);


-- 4. Create the User Review Logs Table (Cognitive Delay tracking)
CREATE TABLE if not exists public.user_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  rating TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  stability_before DOUBLE PRECISION NOT NULL,
  stability_after DOUBLE PRECISION NOT NULL,
  review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on Review Logs
ALTER TABLE public.user_review_logs ENABLE ROW LEVEL SECURITY;

create policy "Users can view their own review logs" 
  on public.user_review_logs for select 
  using (auth.uid() = user_id);

create policy "Users can log their own reviews" 
  on public.user_review_logs for insert 
  with check (auth.uid() = user_id);


-- 5. Automate Public.Users Profile Creation on Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, xp, streak_days)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 
    0, 
    1
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
