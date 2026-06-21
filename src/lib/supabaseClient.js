import { createClient } from '@supabase/supabase-js';

// These environment variables are grabbed from Vite.
// You must create a .env.local file at the root of the project to run the real database!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
