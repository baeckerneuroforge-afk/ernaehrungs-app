-- User-ID Indexes auf häufig gefilterte Tabellen. RLS-Policies scannen
-- user_id bei jedem Query — ohne Index wird das bei größeren Volumina teuer.
-- In Supabase SQL Editor ausführen.

CREATE INDEX IF NOT EXISTS idx_ea_messages_user_id ON ea_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_ziele_user_id ON ea_ziele(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_meal_plans_user_id ON ea_meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_feedback_session_id ON ea_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ea_feedback_user_id ON ea_feedback(user_id);
