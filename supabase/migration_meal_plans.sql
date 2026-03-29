-- Migration: Add structured plan data columns to ea_meal_plans
-- Run this in the Supabase SQL Editor

-- Add new columns (IF NOT EXISTS via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ea_meal_plans' AND column_name = 'plan_data'
  ) THEN
    ALTER TABLE ea_meal_plans ADD COLUMN plan_data jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ea_meal_plans' AND column_name = 'parameters'
  ) THEN
    ALTER TABLE ea_meal_plans ADD COLUMN parameters jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ea_meal_plans' AND column_name = 'status'
  ) THEN
    ALTER TABLE ea_meal_plans ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Make inhalt optional (was previously required for markdown plans)
ALTER TABLE ea_meal_plans ALTER COLUMN inhalt DROP NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ea_meal_plans'
ORDER BY ordinal_position;
