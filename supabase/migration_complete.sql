-- =============================================================================
-- KOMPLETTE MIGRATION: Clerk Auth + Stripe + Credit-System
-- Reihenfolge: Policies droppen → Views droppen → FK droppen → Typen ändern
--              → Tabellen erstellen → Views neu erstellen
-- =============================================================================

BEGIN;

-- =============================================================================
-- SCHRITT 1a: ALLE RLS POLICIES AUF ea_-TABELLEN DROPPEN
-- =============================================================================

-- ea_profiles (3 Policies)
DROP POLICY IF EXISTS "Users can read own profile" ON ea_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON ea_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON ea_profiles;

-- ea_documents (3 Policies, "delete" existiert evtl. doppelt)
DROP POLICY IF EXISTS "Anyone can read documents" ON ea_documents;
DROP POLICY IF EXISTS "Auth users can insert documents" ON ea_documents;
DROP POLICY IF EXISTS "Auth users can delete documents" ON ea_documents;

-- ea_conversations (3 Policies)
DROP POLICY IF EXISTS "Users can read own conversations" ON ea_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON ea_conversations;
DROP POLICY IF EXISTS "Admin can read all conversations" ON ea_conversations;

-- ea_user_roles (1 Policy)
DROP POLICY IF EXISTS "Users can read own role" ON ea_user_roles;

-- ea_weight_logs (1 Policy)
DROP POLICY IF EXISTS "Users can manage own weight logs" ON ea_weight_logs;

-- ea_ziele (1 Policy)
DROP POLICY IF EXISTS "Users can manage own goals" ON ea_ziele;

-- ea_meal_plans (2 Policies)
DROP POLICY IF EXISTS "Users can manage own meal plans" ON ea_meal_plans;
DROP POLICY IF EXISTS "Admin can read all meal plans" ON ea_meal_plans;

-- ea_food_log (1 Policy)
DROP POLICY IF EXISTS "Users can manage own food log" ON ea_food_log;

-- ea_blog_posts (2 Policies)
DROP POLICY IF EXISTS "public_read_published" ON ea_blog_posts;
DROP POLICY IF EXISTS "admin_full_access" ON ea_blog_posts;

-- ea_feedback (2 Policies)
DROP POLICY IF EXISTS "Users can insert own feedback" ON ea_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON ea_feedback;

-- ea_messages (2 Policies)
DROP POLICY IF EXISTS "Users can send messages" ON ea_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON ea_messages;

-- =============================================================================
-- SCHRITT 1b: VIEWS DROPPEN (referenzieren user_id als UUID)
-- =============================================================================

-- ea_conversation_sessions basiert auf ea_conversations.user_id
DROP VIEW IF EXISTS ea_conversation_sessions;

-- =============================================================================
-- SCHRITT 2: FOREIGN KEY CONSTRAINTS DROPPEN + user_id UUID → TEXT
-- =============================================================================

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

-- ea_blog_posts (author_id, nicht user_id)
ALTER TABLE ea_blog_posts DROP CONSTRAINT IF EXISTS ea_blog_posts_author_id_fkey;
ALTER TABLE ea_blog_posts ALTER COLUMN author_id TYPE text USING author_id::text;

-- ea_messages
ALTER TABLE ea_messages DROP CONSTRAINT IF EXISTS ea_messages_user_id_fkey;
ALTER TABLE ea_messages ALTER COLUMN user_id TYPE text USING user_id::text;

-- ea_feedback (user_id existiert evtl. nicht)
DO $$ BEGIN
  ALTER TABLE ea_feedback DROP CONSTRAINT IF EXISTS ea_feedback_user_id_fkey;
  ALTER TABLE ea_feedback ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- =============================================================================
-- SCHRITT 3: ea_users TABELLE ERSTELLEN (Clerk + Stripe)
-- =============================================================================

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

-- =============================================================================
-- SCHRITT 4: RLS DEAKTIVIEREN (Access Control über Clerk server-side)
-- =============================================================================

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

-- =============================================================================
-- SCHRITT 5: ADMIN-FUNKTION AKTUALISIEREN (ohne auth.uid())
-- =============================================================================

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

-- Alte auth.uid()-basierte Version droppen (andere Signatur)
DROP FUNCTION IF EXISTS ea_is_admin();

-- =============================================================================
-- SCHRITT 5b: VIEWS NEU ERSTELLEN (mit text-Spaltentyp)
-- =============================================================================

CREATE OR REPLACE VIEW ea_conversation_sessions AS
SELECT
  c1.user_id,
  c1.session_id,
  MIN(c1.created_at) AS started_at,
  MAX(c1.created_at) AS last_message_at,
  COUNT(*) AS message_count,
  (
    SELECT c2.content
    FROM ea_conversations c2
    WHERE c2.session_id = c1.session_id
      AND c2.user_id = c1.user_id
      AND c2.role = 'user'
    ORDER BY c2.created_at ASC
    LIMIT 1
  ) AS title
FROM ea_conversations c1
GROUP BY c1.user_id, c1.session_id;

-- =============================================================================
-- SCHRITT 6: CREDIT-SYSTEM
-- =============================================================================

-- Credits-Spalten zu ea_users hinzufügen
ALTER TABLE ea_users ADD COLUMN IF NOT EXISTS credits_subscription integer DEFAULT 0;
ALTER TABLE ea_users ADD COLUMN IF NOT EXISTS credits_topup integer DEFAULT 0;
ALTER TABLE ea_users ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz DEFAULT now();

-- Credit-Transaktions-Log
CREATE TABLE IF NOT EXISTS ea_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES ea_users(clerk_id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription_grant', 'topup_purchase', 'chat_usage', 'plan_generation', 'review', 'manual_adjustment', 'expiry_reset')),
  description text,
  balance_after integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_credit_transactions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON ea_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON ea_credit_transactions(created_at);

COMMIT;

-- =============================================================================
-- VERIFIKATION (nach COMMIT, damit Tabellen sichtbar sind)
-- =============================================================================

SELECT 'ea_users Spalten:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ea_users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ea_credit_transactions Spalten:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ea_credit_transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Verbleibende Policies auf ea_-Tabellen:' as info;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'ea_%';
