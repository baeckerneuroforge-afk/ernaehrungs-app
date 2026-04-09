-- =============================================================================
-- Migration: Admin Audit Log
-- Tracks every admin read/write action for DSGVO accountability.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ea_admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  target_user_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON ea_admin_audit_log(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON ea_admin_audit_log(target_user_id, created_at DESC);
