-- Individuelles Kalorienziel aus dem Kalorienrechner.
-- calorie_target: absoluter kcal/Tag-Wert (final, nach Anpassung).
-- calorie_adjustment: Delta zum TDEE (-1500..+1500), fuer UI-Restore.
ALTER TABLE ea_profiles
  ADD COLUMN IF NOT EXISTS calorie_target integer,
  ADD COLUMN IF NOT EXISTS calorie_adjustment integer;
