-- CSV-Import: Add source/dedup columns to ea_food_log
-- mahlzeit_typ already exists; only add the two new columns.

ALTER TABLE ea_food_log ADD COLUMN IF NOT EXISTS externe_quelle TEXT;
ALTER TABLE ea_food_log ADD COLUMN IF NOT EXISTS externe_id TEXT;

-- Index for dedup lookups during import
CREATE INDEX IF NOT EXISTS idx_food_log_externe_id
  ON ea_food_log (user_id, externe_id)
  WHERE externe_id IS NOT NULL;
