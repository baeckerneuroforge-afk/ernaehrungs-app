-- ============================================
-- Ernährungs-App Phase 2: Migration
-- Neue Tabellen + Admin-System
-- ============================================

-- ============================================
-- 1. Admin-Rollensystem
-- ============================================
CREATE TABLE IF NOT EXISTS ea_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON ea_user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Helper: Prüft ob der aktuelle User Admin ist
CREATE OR REPLACE FUNCTION ea_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ea_user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================
-- 2. Gewichtstracker
-- ============================================
CREATE TABLE IF NOT EXISTS ea_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gewicht_kg numeric(5,1) NOT NULL,
  notiz text,
  gemessen_am date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ea_weight_logs_user_date
  ON ea_weight_logs(user_id, gemessen_am);

ALTER TABLE ea_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own weight logs"
  ON ea_weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. Ziele
-- ============================================
CREATE TABLE IF NOT EXISTS ea_ziele (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  typ text NOT NULL CHECK (typ IN ('gewicht', 'kalorien', 'custom')),
  beschreibung text NOT NULL,
  zielwert numeric,
  startwert numeric,
  einheit text,
  zieldatum date,
  erreicht boolean DEFAULT false,
  erreicht_am date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ea_ziele ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON ea_ziele FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Ernährungspläne
-- ============================================
CREATE TABLE IF NOT EXISTS ea_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titel text NOT NULL,
  zeitraum text,
  inhalt text NOT NULL,
  profil_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal plans"
  ON ea_meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can read all meal plans"
  ON ea_meal_plans FOR SELECT
  USING (ea_is_admin());

-- ============================================
-- 5. Admin-Zugriff auf Conversations
-- ============================================
CREATE POLICY "Admin can read all conversations"
  ON ea_conversations FOR SELECT
  USING (ea_is_admin());
