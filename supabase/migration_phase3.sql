-- ============================================
-- Ernährungs-App Phase 3: Migration
-- ============================================
-- Features: Ernährungstagebuch, Onboarding-Flag,
--           Chat-Sessions View, Performance-Index
-- ============================================

-- ============================================
-- 1. Ernährungstagebuch (Food Diary)
-- ============================================
CREATE TABLE IF NOT EXISTS ea_food_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mahlzeit_typ text NOT NULL CHECK (mahlzeit_typ IN ('fruehstueck', 'mittag', 'abend', 'snack')),
  beschreibung text NOT NULL,
  kalorien_geschaetzt integer,
  datum date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_food_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own food log"
  ON ea_food_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ea_food_log_user_datum
  ON ea_food_log(user_id, datum);

-- ============================================
-- 2. Onboarding-Flag auf Profilen
-- ============================================
ALTER TABLE ea_profiles
  ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false;

-- ============================================
-- 3. Chat-Sessions View für Verlauf-Sidebar
-- ============================================
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

-- ============================================
-- 4. Performance-Index für Themen-Analyse
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ea_conversations_role
  ON ea_conversations(role, created_at DESC);
