-- =============================================================================
-- Migration: AGB Acceptance Timestamp
-- Records the exact moment a user accepted the Terms of Service (AGB).
-- Required for DSGVO/VVG compliance — we need to prove consent was given.
-- =============================================================================

ALTER TABLE ea_users
  ADD COLUMN IF NOT EXISTS agb_accepted_at TIMESTAMPTZ;
