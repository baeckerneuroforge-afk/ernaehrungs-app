-- =============================================================================
-- Migration: Map old Supabase Auth UUIDs to new Clerk IDs
-- Run AFTER: migration_clerk_stripe.sql (columns already text)
-- Run AFTER: Both users have registered with Clerk
-- =============================================================================
-- INSTRUCTIONS:
-- 1. Register both accounts in Clerk (same email addresses)
-- 2. Find your Clerk IDs in the Clerk Dashboard → Users
-- 3. Replace the placeholder values below with actual IDs
-- 4. Run this script in Supabase SQL Editor

-- Step 1: Set the mapping variables
-- Replace these with your actual values!
-- Find old UUIDs: SELECT DISTINCT user_id FROM ea_profiles;

DO $$
DECLARE
  -- USER 1 (Janine - Admin)
  old_id_1 text := 'OLD_SUPABASE_UUID_JANINE';  -- Replace with Janine's old UUID
  new_id_1 text := 'CLERK_USER_ID_JANINE';       -- Replace with Janine's Clerk ID

  -- USER 2 (Andre)
  old_id_2 text := 'OLD_SUPABASE_UUID_ANDRE';    -- Replace with Andre's old UUID
  new_id_2 text := 'CLERK_USER_ID_ANDRE';         -- Replace with Andre's Clerk ID

  -- Add more users if needed:
  -- old_id_3 text := '...';
  -- new_id_3 text := '...';

BEGIN
  -- Step 2: Update all tables with new Clerk IDs

  -- ea_profiles
  UPDATE ea_profiles SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_profiles SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_conversations (Chat-Verläufe)
  UPDATE ea_conversations SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_conversations SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_messages (Chat-Nachrichten)
  UPDATE ea_messages SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_messages SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_user_roles (Admin-Rollen - WICHTIG für Janine!)
  UPDATE ea_user_roles SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_user_roles SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_weight_logs (Gewichtsdaten)
  UPDATE ea_weight_logs SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_weight_logs SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_ziele (Ziele)
  UPDATE ea_ziele SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_ziele SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_meal_plans (Ernährungspläne)
  UPDATE ea_meal_plans SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_meal_plans SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_food_log (Tagebuch)
  UPDATE ea_food_log SET user_id = new_id_1 WHERE user_id = old_id_1;
  UPDATE ea_food_log SET user_id = new_id_2 WHERE user_id = old_id_2;

  -- ea_blog_posts (author_id)
  UPDATE ea_blog_posts SET author_id = new_id_1 WHERE author_id = old_id_1;
  UPDATE ea_blog_posts SET author_id = new_id_2 WHERE author_id = old_id_2;

  -- ea_feedback (falls vorhanden)
  BEGIN
    UPDATE ea_feedback SET user_id = new_id_1 WHERE user_id = old_id_1;
    UPDATE ea_feedback SET user_id = new_id_2 WHERE user_id = old_id_2;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RAISE NOTICE 'Migration complete! Updated user IDs for all tables.';
  RAISE NOTICE 'User 1 (Janine): % -> %', old_id_1, new_id_1;
  RAISE NOTICE 'User 2 (Andre): % -> %', old_id_2, new_id_2;
END $$;

-- Step 3: Verify the migration
-- Run these queries to check:
-- SELECT user_id, name FROM ea_profiles;
-- SELECT user_id, role FROM ea_user_roles;
-- SELECT user_id, COUNT(*) FROM ea_conversations GROUP BY user_id;
-- SELECT user_id, COUNT(*) FROM ea_messages GROUP BY user_id;
