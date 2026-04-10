-- Zusatz zu migration_food_log_macros_photo.sql:
-- Feedback zur Foto-Analyse + gespeicherter Tipp + Budget-Prozent.

ALTER TABLE ea_food_log
  ADD COLUMN IF NOT EXISTS photo_feedback TEXT,
  ADD COLUMN IF NOT EXISTS photo_tip TEXT,
  ADD COLUMN IF NOT EXISTS photo_daily_budget_percent INTEGER;

-- CHECK-Constraint für photo_feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ea_food_log_photo_feedback_check'
  ) THEN
    ALTER TABLE ea_food_log
      ADD CONSTRAINT ea_food_log_photo_feedback_check
      CHECK (photo_feedback IS NULL OR photo_feedback IN ('accurate', 'too_low', 'too_high'));
  END IF;
END $$;
