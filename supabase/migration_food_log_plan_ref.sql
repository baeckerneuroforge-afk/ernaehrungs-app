-- Migration: Direktverbindung Tagebuch ↔ Plan-Mahlzeit
--
-- Fügt zwei nullable Spalten auf ea_food_log hinzu, damit ein Tagebuch-
-- Eintrag optional auf eine konkrete Mahlzeit im aktiven Ernährungsplan
-- zeigen kann:
--
--   plan_id        UUID, FK auf ea_meal_plans(id).
--                  ON DELETE SET NULL — Eintrag bleibt erhalten, auch wenn
--                  der ursprüngliche Plan später gelöscht wird.
--   plan_meal_ref  TEXT, Format "dayIndex:mealIndex" (0-basiert) — z.B.
--                  "2:1" = Tag 3, Mahlzeit 2 im plan_data.weekPlan-Array.
--                  Pläne werden nicht editiert (nur POST + DELETE), die
--                  Positions-ID ist also stabil.
--
-- Plus Partial-Index für den häufigen "wurde Plan-Mahlzeit X heute schon
-- übernommen?"-Lookup. Partial weil die allermeisten Tagebuch-Einträge
-- keine plan_meal_ref haben.
--
-- Idempotent: kann mehrfach ausgeführt werden.

ALTER TABLE ea_food_log
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS plan_meal_ref text;

-- FK separat — ADD CONSTRAINT IF NOT EXISTS ist nicht portabel.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ea_food_log_plan_id_fkey'
  ) THEN
    ALTER TABLE ea_food_log
      ADD CONSTRAINT ea_food_log_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES ea_meal_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ea_food_log_plan_meal_ref
  ON ea_food_log (plan_id, plan_meal_ref)
  WHERE plan_meal_ref IS NOT NULL;

-- Verifikation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ea_food_log'
  AND column_name IN ('plan_id', 'plan_meal_ref')
ORDER BY column_name;
