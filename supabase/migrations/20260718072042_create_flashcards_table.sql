-- Migration: create_flashcards_table

-- 1. Ensure `line_user_id` exists on `public.users`
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='users' AND column_name='line_user_id') THEN
        ALTER TABLE public.users ADD COLUMN line_user_id TEXT UNIQUE;
    END IF;
END $$;

-- 2. Create `flashcards` table
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    part_of_speech TEXT,
    translation TEXT,
    english_definition TEXT,
    example_sentence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    fsrs_data JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON public.users(line_user_id);

-- RLS Policies
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can view their own flashcards'
    ) THEN
        CREATE POLICY "Users can view their own flashcards" ON public.flashcards
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can insert their own flashcards'
    ) THEN
        CREATE POLICY "Users can insert their own flashcards" ON public.flashcards
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can update their own flashcards'
    ) THEN
        CREATE POLICY "Users can update their own flashcards" ON public.flashcards
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can delete their own flashcards'
    ) THEN
        CREATE POLICY "Users can delete their own flashcards" ON public.flashcards
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
