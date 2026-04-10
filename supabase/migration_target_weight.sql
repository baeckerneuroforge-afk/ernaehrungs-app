-- Personal weight-loss target with timeframe
-- Used by lib/tdee.ts to compute a custom deficit instead of the flat -500 kcal.

ALTER TABLE ea_profiles
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC;

ALTER TABLE ea_profiles
  ADD COLUMN IF NOT EXISTS target_timeframe TEXT DEFAULT 'no_rush'
    CHECK (target_timeframe IN ('3_months', '6_months', '9_months', '12_months', 'no_rush'));
