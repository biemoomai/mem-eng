-- ============================================================
-- Mem-eng: Curriculum Words Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Create the curriculum_words table
CREATE TABLE IF NOT EXISTS public.curriculum_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_name TEXT NOT NULL,      -- 'Oxford 5000', 'TOEIC Essential', 'IELTS Academic'
  word TEXT NOT NULL,                 -- Vocabulary word (lowercase, trimmed)
  pos TEXT NOT NULL,                  -- Part of speech (e.g. 'noun', 'verb', 'adjective')
  cefr_level TEXT DEFAULT 'B2',       -- CEFR level (A1, A2, B1, B2, C1, C2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate entries of the same word within the same curriculum
  UNIQUE(curriculum_name, word)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.curriculum_words ENABLE ROW LEVEL SECURITY;

-- 1. Select Policy: Anyone (both guests and logged-in users) can view the lists
CREATE POLICY "Anyone can read curriculum words"
  ON public.curriculum_words FOR SELECT
  USING (true);

-- 2. Insert/Modify Policy: Only authenticated service role or database administrator can modify the lists
CREATE POLICY "Service role can modify curriculum words"
  ON public.curriculum_words FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
