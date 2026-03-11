-- Migration: Make review_consent nullable (NULL = never asked, true = consented, false = declined)

-- Remove the default so NULL means "user hasn't been asked yet"
ALTER TABLE ea_profiles ALTER COLUMN review_consent DROP DEFAULT;

-- Reset existing users who got false by the DB default (they never explicitly responded)
UPDATE ea_profiles SET review_consent = NULL WHERE review_consent = false;
