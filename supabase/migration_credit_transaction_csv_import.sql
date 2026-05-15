-- Allow the credit ledger to record all currently used AI/action types,
-- including the newly charged CSV import preview.
ALTER TABLE public.ea_credit_transactions
  DROP CONSTRAINT IF EXISTS ea_credit_transactions_type_check;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname
    INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'ea_credit_transactions'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%subscription_grant%'
   LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.ea_credit_transactions DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.ea_credit_transactions
  ADD CONSTRAINT ea_credit_transactions_type_check
  CHECK (
    type IN (
      'subscription_grant',
      'topup_purchase',
      'chat_usage',
      'chat_usage_premium',
      'chat_image',
      'plan_generation',
      'review',
      'foto_analysis',
      'monthly_report',
      'smart_log',
      'csv_import',
      'manual_adjustment',
      'expiry_reset',
      'refund'
    )
  );
