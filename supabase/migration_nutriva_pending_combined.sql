-- =============================================================================
-- Nutriva — Sammel-Migration (Audit-Remediation Phasen 1/3/7 + AI-Usage-Logging)
--
-- Alles idempotent (CREATE ... IF NOT EXISTS, DROP POLICY IF EXISTS,
-- CREATE OR REPLACE FUNCTION) → gefahrlos mehrfach ausführbar.
-- Voraussetzung: Funktion is_admin() existiert bereits (von bestehenden Policies
-- genutzt). Reihenfolge der Blöcke ist unkritisch; sie sind voneinander unabhängig.
--
-- In den Supabase-SQL-Editor einfügen und als Ganzes ausführen.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) ea_ai_usage — Token-/Kosten-Logging pro User & Action
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_user_created     ON ea_ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_endpoint_created ON ea_ai_usage(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_plan_created     ON ea_ai_usage(plan, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ea_ai_usage_created          ON ea_ai_usage(created_at DESC);

ALTER TABLE ea_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read ai usage" ON ea_ai_usage;
CREATE POLICY "Admins read ai usage"
  ON ea_ai_usage
  FOR SELECT
  USING (is_admin());


-- -----------------------------------------------------------------------------
-- 2) Atomare Credit-RPCs (Phase 3)
--    Row-locked Balance-UPDATE + Ledger-INSERT(s) in EINER Transaktion, damit
--    ein Fehler mittendrin ea_users und ea_credit_transactions nicht inkonsistent
--    zurücklässt. Spiegelt deduct_credits_atomic.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_subscription_credits_atomic(
  p_clerk_id TEXT,
  p_plan_credits INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_sub INTEGER;
  v_topup INTEGER;
BEGIN
  SELECT credits_subscription, credits_topup
    INTO v_old_sub, v_topup
    FROM ea_users
   WHERE clerk_id = p_clerk_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  UPDATE ea_users
     SET credits_subscription = p_plan_credits,
         credits_reset_at = NOW(),
         updated_at = NOW()
   WHERE clerk_id = p_clerk_id;

  -- Log expiry of the old subscription credits (matches TS wording).
  IF COALESCE(v_old_sub, 0) > 0 THEN
    INSERT INTO ea_credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (
      p_clerk_id,
      -v_old_sub,
      'expiry_reset',
      format('Monatliches Reset: %s Abo-Credits verfallen', v_old_sub),
      p_plan_credits + COALESCE(v_topup, 0)
    );
  END IF;

  -- Log the new grant.
  INSERT INTO ea_credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (
    p_clerk_id,
    p_plan_credits,
    'subscription_grant',
    format('Monatliches Guthaben: %s Credits', p_plan_credits),
    p_plan_credits + COALESCE(v_topup, 0)
  );

  RETURN json_build_object(
    'success', true,
    'old_sub', COALESCE(v_old_sub, 0),
    'new_total', p_plan_credits + COALESCE(v_topup, 0)
  );
END;
$$;

-- add_credits_atomic: increment a bucket and log the transaction atomically.
-- p_bucket must be 'credits_subscription' or 'credits_topup'.
CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_clerk_id TEXT,
  p_amount INTEGER,
  p_bucket TEXT,
  p_type TEXT,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub INTEGER;
  v_topup INTEGER;
  v_new_total INTEGER;
BEGIN
  IF p_bucket NOT IN ('credits_subscription', 'credits_topup') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_bucket');
  END IF;

  SELECT credits_subscription, credits_topup
    INTO v_sub, v_topup
    FROM ea_users
   WHERE clerk_id = p_clerk_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  IF p_bucket = 'credits_subscription' THEN
    UPDATE ea_users
       SET credits_subscription = COALESCE(credits_subscription, 0) + p_amount,
           updated_at = NOW()
     WHERE clerk_id = p_clerk_id;
  ELSE
    UPDATE ea_users
       SET credits_topup = COALESCE(credits_topup, 0) + p_amount,
           updated_at = NOW()
     WHERE clerk_id = p_clerk_id;
  END IF;

  v_new_total := COALESCE(v_sub, 0) + COALESCE(v_topup, 0) + p_amount;

  INSERT INTO ea_credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_clerk_id, p_amount, p_type, p_description, v_new_total);

  RETURN json_build_object('success', true, 'new_total', v_new_total);
END;
$$;


-- -----------------------------------------------------------------------------
-- 3) ea_cron_state — Checkpoint-Tabelle für paginierte Cron-Jobs (Phase 7)
--    last_processed_user_id = '' bedeutet Zyklus-Start. Nur Service Role.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ea_cron_state (
  job_name text PRIMARY KEY,
  last_processed_user_id text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ea_cron_state ENABLE ROW LEVEL SECURITY;
-- Keine Policies: nur Service Role (bypassed RLS), alle anderen geblockt.


-- -----------------------------------------------------------------------------
-- 4) RLS auf bisher ungeschützten Tabellen (Phase 1) — ggf. schon ausgeführt
-- -----------------------------------------------------------------------------
ALTER TABLE ea_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read support tickets" ON ea_support_tickets;
CREATE POLICY "Admins read support tickets"
  ON ea_support_tickets FOR SELECT USING (is_admin());

ALTER TABLE ea_monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read monthly reports" ON ea_monthly_reports;
CREATE POLICY "Admins read monthly reports"
  ON ea_monthly_reports FOR SELECT USING (is_admin());

ALTER TABLE ea_stripe_events ENABLE ROW LEVEL SECURITY;
-- Keine Policies: nur Service Role.


-- =============================================================================
-- Verifikation (optional, separat ausführen):
--   SELECT to_regclass('public.ea_ai_usage'), to_regclass('public.ea_cron_state');
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('reset_subscription_credits_atomic','add_credits_atomic');
-- =============================================================================
