-- =============================================================================
-- Migration: AI Usage Logging
-- Stores token usage and estimated API costs per user/action for pricing analysis.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ea_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES ea_users(clerk_id) ON DELETE SET NULL,
  plan text,
  endpoint text NOT NULL,
  action text NOT NULL,
  model text NOT NULL,
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  cache_read_tokens int DEFAULT 0,
  cache_write_tokens int DEFAULT 0,
  image_tokens_estimate int DEFAULT 0,
  embedding_tokens int DEFAULT 0,
  cost_usd numeric(12,8),
  cost_eur numeric(12,8),
  credits_charged int,
  credits_refunded boolean DEFAULT false,
  request_id text,
  error text,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_user_created
  ON ea_ai_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_endpoint_created
  ON ea_ai_usage(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_plan_created
  ON ea_ai_usage(plan, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_created
  ON ea_ai_usage(created_at DESC);

ALTER TABLE ea_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read ai usage" ON ea_ai_usage;
CREATE POLICY "Admins read ai usage"
  ON ea_ai_usage
  FOR SELECT
  USING (is_admin());
