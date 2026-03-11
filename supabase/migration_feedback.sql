-- Migration: Add quality review consent + feedback table

-- 1. Add review_consent to ea_profiles
ALTER TABLE ea_profiles ADD COLUMN IF NOT EXISTS review_consent boolean DEFAULT false;

-- 2. Create ea_feedback table
CREATE TABLE IF NOT EXISTS ea_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on ea_feedback
ALTER TABLE ea_feedback ENABLE ROW LEVEL SECURITY;

-- 4. Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON ea_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON ea_feedback FOR SELECT
  USING (auth.uid() = user_id);
