-- =============================================================================
-- Migration: Low-Credit Warning Throttle
-- Tracks when we last sent a "credits almost empty" email so deductCredits()
-- can rate-limit the warning to at most once per 24h. Without this column,
-- every single chat message at low balance would trigger a fresh email.
-- =============================================================================

ALTER TABLE ea_users
  ADD COLUMN IF NOT EXISTS last_credit_warning_at TIMESTAMPTZ;
