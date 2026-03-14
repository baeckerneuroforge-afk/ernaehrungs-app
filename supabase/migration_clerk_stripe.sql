-- =============================================================================
-- Migration: Clerk Auth + Stripe Payments
-- Replaces Supabase Auth with Clerk, adds Stripe subscription tracking
-- =============================================================================

-- 1. Create users table for Clerk sync + Stripe subscription data
CREATE TABLE IF NOT EXISTS ea_users (
  clerk_id text PRIMARY KEY,
  email text NOT NULL,
  name text,
  image_url text,
  stripe_customer_id text UNIQUE,
  subscription_plan text DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'pro_plus')),
  subscription_status text DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'trialing')),
  subscription_period_end timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Change user_id columns from uuid to text (for Clerk IDs)
-- Drop foreign key constraints first, then alter column types

-- ea_profiles
ALTER TABLE ea_profiles DROP CONSTRAINT IF EXISTS ea_profiles_user_id_fkey;
ALTER TABLE ea_profiles ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_conversations
ALTER TABLE ea_conversations DROP CONSTRAINT IF EXISTS ea_conversations_user_id_fkey;
ALTER TABLE ea_conversations ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_user_roles
ALTER TABLE ea_user_roles DROP CONSTRAINT IF EXISTS ea_user_roles_user_id_fkey;
ALTER TABLE ea_user_roles ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_weight_logs
ALTER TABLE ea_weight_logs DROP CONSTRAINT IF EXISTS ea_weight_logs_user_id_fkey;
ALTER TABLE ea_weight_logs ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_ziele
ALTER TABLE ea_ziele DROP CONSTRAINT IF EXISTS ea_ziele_user_id_fkey;
ALTER TABLE ea_ziele ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_meal_plans
ALTER TABLE ea_meal_plans DROP CONSTRAINT IF EXISTS ea_meal_plans_user_id_fkey;
ALTER TABLE ea_meal_plans ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_food_log
ALTER TABLE ea_food_log DROP CONSTRAINT IF EXISTS ea_food_log_user_id_fkey;
ALTER TABLE ea_food_log ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_blog_posts (author_id)
ALTER TABLE ea_blog_posts DROP CONSTRAINT IF EXISTS ea_blog_posts_author_id_fkey;
ALTER TABLE ea_blog_posts ALTER COLUMN author_id TYPE text USING author_id::text;

-- ea_messages
ALTER TABLE ea_messages DROP CONSTRAINT IF EXISTS ea_messages_user_id_fkey;
ALTER TABLE ea_messages ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_feedback (if user_id exists)
DO $$ BEGIN
  ALTER TABLE ea_feedback ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- 3. Disable RLS on all tables (enforce access control server-side via Clerk)
ALTER TABLE ea_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_weight_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_ziele DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_meal_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_food_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE ea_users DISABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ea_feedback DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 4. Update admin function to work without auth.uid()
CREATE OR REPLACE FUNCTION ea_is_admin(p_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ea_user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;
