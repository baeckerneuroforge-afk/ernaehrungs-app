-- =============================================================================
-- Migration: Stripe Webhook Idempotency
-- Stripe retries webhooks on non-2xx responses. Without a dedupe check, a
-- retried checkout.session.completed would grant credits twice. This table
-- records every processed event_id so retries become no-ops.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ea_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ea_stripe_events_processed_at
  ON ea_stripe_events(processed_at);
