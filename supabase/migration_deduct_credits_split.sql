-- Return which buckets were drained so refunds can restore top-up credits
-- instead of always writing back into the expiring subscription bucket.
-- Safe to re-run: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_clerk_id TEXT,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub INTEGER;
  v_topup INTEGER;
  v_sub_deduct INTEGER;
  v_topup_deduct INTEGER;
  v_new_sub INTEGER;
  v_new_topup INTEGER;
BEGIN
  SELECT credits_subscription, credits_topup
    INTO v_sub, v_topup
    FROM ea_users
   WHERE clerk_id = p_clerk_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  IF (COALESCE(v_sub, 0) + COALESCE(v_topup, 0)) < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'insufficient',
      'new_sub', COALESCE(v_sub, 0),
      'new_topup', COALESCE(v_topup, 0)
    );
  END IF;

  v_sub_deduct := LEAST(COALESCE(v_sub, 0), p_amount);
  v_topup_deduct := p_amount - v_sub_deduct;

  v_new_sub := COALESCE(v_sub, 0) - v_sub_deduct;
  v_new_topup := COALESCE(v_topup, 0) - v_topup_deduct;

  UPDATE ea_users
     SET credits_subscription = v_new_sub,
         credits_topup = v_new_topup,
         updated_at = NOW()
   WHERE clerk_id = p_clerk_id;

  RETURN json_build_object(
    'success', true,
    'new_sub', v_new_sub,
    'new_topup', v_new_topup,
    'sub_deducted', v_sub_deduct,
    'topup_deducted', v_topup_deduct
  );
END;
$$;
