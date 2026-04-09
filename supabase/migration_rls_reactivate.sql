-- =============================================================================
-- Migration: Reactivate Row Level Security
-- RLS wurde bei der Clerk-Migration (migration_clerk_stripe.sql) deaktiviert.
-- Alle Server-Queries laufen ueber createSupabaseAdmin() (Service Role Key,
-- bypassed RLS). Diese Policies sind Defense-in-Depth: sie schuetzen falls
-- jemand den Anon Key oder einen direkten Client-Zugriff bekommt.
--
-- Da wir Clerk statt Supabase Auth nutzen, extrahieren die Policies die
-- Clerk-User-ID aus dem JWT-sub-Claim:
--   current_setting('request.jwt.claims', true)::json->>'sub'
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS aktivieren
-- ---------------------------------------------------------------------------
-- Hinweis: ea_conversation_sessions ist eine VIEW (siehe migration_phase3.sql),
-- keine Tabelle. Views erben RLS von ihren Basistabellen, daher kein ALTER.

ALTER TABLE ea_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_food_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_weight_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_ziele                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_meal_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_feedback             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_credit_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ea_admin_audit_log      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Helper: Clerk User-ID aus JWT + Admin-Check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clerk_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub'
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ea_user_roles
    WHERE user_id = clerk_user_id() AND role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- 3. Policies fuer Tabellen mit user_id
-- ---------------------------------------------------------------------------

-- ea_profiles
DROP POLICY IF EXISTS "Users read own data"   ON ea_profiles;
DROP POLICY IF EXISTS "Users insert own data" ON ea_profiles;
DROP POLICY IF EXISTS "Users update own data" ON ea_profiles;
DROP POLICY IF EXISTS "Users delete own data" ON ea_profiles;
CREATE POLICY "Users read own data"   ON ea_profiles FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_profiles FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_profiles FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_profiles FOR DELETE USING (user_id = clerk_user_id());

-- ea_conversations
DROP POLICY IF EXISTS "Users read own data"   ON ea_conversations;
DROP POLICY IF EXISTS "Users insert own data" ON ea_conversations;
DROP POLICY IF EXISTS "Users update own data" ON ea_conversations;
DROP POLICY IF EXISTS "Users delete own data" ON ea_conversations;
CREATE POLICY "Users read own data"   ON ea_conversations FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_conversations FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_conversations FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_conversations FOR DELETE USING (user_id = clerk_user_id());

-- ea_food_log
DROP POLICY IF EXISTS "Users read own data"   ON ea_food_log;
DROP POLICY IF EXISTS "Users insert own data" ON ea_food_log;
DROP POLICY IF EXISTS "Users update own data" ON ea_food_log;
DROP POLICY IF EXISTS "Users delete own data" ON ea_food_log;
CREATE POLICY "Users read own data"   ON ea_food_log FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_food_log FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_food_log FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_food_log FOR DELETE USING (user_id = clerk_user_id());

-- ea_weight_logs
DROP POLICY IF EXISTS "Users read own data"   ON ea_weight_logs;
DROP POLICY IF EXISTS "Users insert own data" ON ea_weight_logs;
DROP POLICY IF EXISTS "Users update own data" ON ea_weight_logs;
DROP POLICY IF EXISTS "Users delete own data" ON ea_weight_logs;
CREATE POLICY "Users read own data"   ON ea_weight_logs FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_weight_logs FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_weight_logs FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_weight_logs FOR DELETE USING (user_id = clerk_user_id());

-- ea_ziele
DROP POLICY IF EXISTS "Users read own data"   ON ea_ziele;
DROP POLICY IF EXISTS "Users insert own data" ON ea_ziele;
DROP POLICY IF EXISTS "Users update own data" ON ea_ziele;
DROP POLICY IF EXISTS "Users delete own data" ON ea_ziele;
CREATE POLICY "Users read own data"   ON ea_ziele FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_ziele FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_ziele FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_ziele FOR DELETE USING (user_id = clerk_user_id());

-- ea_meal_plans
DROP POLICY IF EXISTS "Users read own data"   ON ea_meal_plans;
DROP POLICY IF EXISTS "Users insert own data" ON ea_meal_plans;
DROP POLICY IF EXISTS "Users update own data" ON ea_meal_plans;
DROP POLICY IF EXISTS "Users delete own data" ON ea_meal_plans;
CREATE POLICY "Users read own data"   ON ea_meal_plans FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_meal_plans FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_meal_plans FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_meal_plans FOR DELETE USING (user_id = clerk_user_id());

-- ea_messages
-- Schema: user_id = Besitzer der Nachricht (User oder deren Admin-Antwort im
-- selben Row). Kein sender_id/recipient_id Feld vorhanden.
-- Nutzer sehen nur ihre eigenen Message-Threads. Admins greifen ueber den
-- Service Role Key zu, der RLS ohnehin bypassed.
DROP POLICY IF EXISTS "Users read own data"   ON ea_messages;
DROP POLICY IF EXISTS "Users insert own data" ON ea_messages;
DROP POLICY IF EXISTS "Users update own data" ON ea_messages;
DROP POLICY IF EXISTS "Users delete own data" ON ea_messages;
CREATE POLICY "Users read own data"   ON ea_messages FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_messages FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_messages FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_messages FOR DELETE USING (user_id = clerk_user_id());

-- ea_feedback
DROP POLICY IF EXISTS "Users read own data"   ON ea_feedback;
DROP POLICY IF EXISTS "Users insert own data" ON ea_feedback;
DROP POLICY IF EXISTS "Users update own data" ON ea_feedback;
DROP POLICY IF EXISTS "Users delete own data" ON ea_feedback;
CREATE POLICY "Users read own data"   ON ea_feedback FOR SELECT USING (user_id = clerk_user_id());
CREATE POLICY "Users insert own data" ON ea_feedback FOR INSERT WITH CHECK (user_id = clerk_user_id());
CREATE POLICY "Users update own data" ON ea_feedback FOR UPDATE USING (user_id = clerk_user_id());
CREATE POLICY "Users delete own data" ON ea_feedback FOR DELETE USING (user_id = clerk_user_id());

-- ea_credit_transactions (read-only fuer User, Inserts nur ueber Service Role)
DROP POLICY IF EXISTS "Users read own data" ON ea_credit_transactions;
CREATE POLICY "Users read own data" ON ea_credit_transactions FOR SELECT USING (user_id = clerk_user_id());

-- ---------------------------------------------------------------------------
-- 4. ea_users: nur SELECT auf eigene clerk_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own row" ON ea_users;
CREATE POLICY "Users read own row" ON ea_users FOR SELECT USING (clerk_id = clerk_user_id());

-- ---------------------------------------------------------------------------
-- 5. ea_user_roles: nur SELECT, keine Schreibrechte ueber Anon Key
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read own role" ON ea_user_roles;
CREATE POLICY "Read own role" ON ea_user_roles FOR SELECT USING (user_id = clerk_user_id());

-- ---------------------------------------------------------------------------
-- 6. ea_documents: SELECT public (Wissensbasis), Writes nur Admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read documents"   ON ea_documents;
DROP POLICY IF EXISTS "Admins write documents"  ON ea_documents;
DROP POLICY IF EXISTS "Admins update documents" ON ea_documents;
DROP POLICY IF EXISTS "Admins delete documents" ON ea_documents;
CREATE POLICY "Public read documents"   ON ea_documents FOR SELECT USING (true);
CREATE POLICY "Admins write documents"  ON ea_documents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update documents" ON ea_documents FOR UPDATE USING (is_admin());
CREATE POLICY "Admins delete documents" ON ea_documents FOR DELETE USING (is_admin());

-- ---------------------------------------------------------------------------
-- 7. ea_blog_posts: SELECT public (nur published), Writes nur Admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read published" ON ea_blog_posts;
DROP POLICY IF EXISTS "Admins read all blog"  ON ea_blog_posts;
DROP POLICY IF EXISTS "Admins write blog"     ON ea_blog_posts;
DROP POLICY IF EXISTS "Admins update blog"    ON ea_blog_posts;
DROP POLICY IF EXISTS "Admins delete blog"    ON ea_blog_posts;
CREATE POLICY "Public read published" ON ea_blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins read all blog"  ON ea_blog_posts FOR SELECT USING (is_admin());
CREATE POLICY "Admins write blog"     ON ea_blog_posts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins update blog"    ON ea_blog_posts FOR UPDATE USING (is_admin());
CREATE POLICY "Admins delete blog"    ON ea_blog_posts FOR DELETE USING (is_admin());

-- ---------------------------------------------------------------------------
-- 8. ea_admin_audit_log: kein Zugriff ueber Anon Key (nur Service Role)
-- ---------------------------------------------------------------------------
-- Mit RLS aktiviert und keiner Policy ist der Tabellen-Zugriff fuer anon/
-- authenticated Rollen vollstaendig gesperrt. Service Role bypassed RLS.
-- (Explizit: keine CREATE POLICY Statements.)
