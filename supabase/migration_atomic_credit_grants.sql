-- =============================================================================
-- Migration: Atomic subscription credit grant + atomic add-credits
-- Mirrors deduct_credits_atomic (migration_atomic_credits.sql): row-locked,
-- balance UPDATE + ledger INSERT(s) in ONE transaction so a mid-way failure
-- can't leave ea_users and ea_credit_transactions inconsistent.
-- =============================================================================

-- reset_subscription_credits_atomic: set the subscription bucket to the plan
-- allowance, log expiry of the old balance (if any) + the new grant, atomically.
-- Returns JSON: { success, old_sub, new_total } or { success:false, reason }.
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
-- Used for topup purchases (topup bucket), refunds + manual grants (subscription
-- bucket). Returns JSON: { success, new_total } or { success:false, reason }.
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
