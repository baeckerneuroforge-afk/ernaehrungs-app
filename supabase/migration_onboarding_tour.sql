-- Migration: Walkthrough tour completion flag
-- Adds a per-profile boolean that gates the /chat walkthrough.

ALTER TABLE ea_profiles
  ADD COLUMN IF NOT EXISTS onboarding_tour_done BOOLEAN DEFAULT false;
