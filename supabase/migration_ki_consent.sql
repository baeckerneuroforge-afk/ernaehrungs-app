-- =============================================================================
-- Migration: KI-Consent Flag
-- Adds ki_consent column for tracking explicit consent to AI processing
-- of health data (Art. 9 Abs. 2 lit. a DSGVO)
-- =============================================================================

ALTER TABLE ea_users ADD COLUMN IF NOT EXISTS ki_consent BOOLEAN DEFAULT false;
