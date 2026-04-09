-- =============================================================================
-- Migration: Last Active Tracking
-- Adds last_active_at to ea_users for inactive-account warning + auto-deletion.
-- A daily cron (/api/cron/inactive-accounts) warns at 11 months and deletes
-- at 12+ months of inactivity.
-- =============================================================================

ALTER TABLE ea_users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing rows so they aren't immediately considered inactive.
UPDATE ea_users
  SET last_active_at = COALESCE(last_active_at, updated_at, created_at, now())
  WHERE last_active_at IS NULL;

-- Index for the daily inactive-scan query.
CREATE INDEX IF NOT EXISTS idx_ea_users_last_active_at
  ON ea_users(last_active_at);
