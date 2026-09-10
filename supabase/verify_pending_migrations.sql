-- =============================================================================
-- Nutriva — Pending-SQL Statuscheck (read-only)
--
-- Im SQL-Editor des LEBENDEN Nutriva-Projekts ausfuehren.
-- Aendert nichts. Jede Zeile ist ein pruefbarer Ist-Stand.
--
-- Stand der Pruefung 2026-09-10:
--   Lokales .env.local und audit_rls_storage.sql zeigen
--   mdwavlbypkvkaxysoerc.supabase.co — DNS NXDOMAIN, Projekt in keinem
--   eingeloggten Supabase-Org sichtbar. Live-Schema deshalb hier nicht
--   belegbar. Dieses Skript ist die fehlende Verifikation, sobald ein
--   Projekt wieder erreichbar ist.
-- =============================================================================

-- 1) Tabellen aus migration_nutriva_pending_combined.sql
SELECT
  'table' AS art,
  t AS name,
  (to_regclass('public.' || t) IS NOT NULL) AS vorhanden
FROM unnest(ARRAY[
  'ea_ai_usage',
  'ea_cron_state',
  'ea_users',
  'ea_documents',
  'ea_food_log',
  'ea_credit_transactions',
  'ea_support_tickets',
  'ea_monthly_reports',
  'ea_stripe_events'
]) AS t
ORDER BY vorhanden, name;

-- 2) RPCs: combined + deduct split
SELECT
  'rpc' AS art,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  (pg_get_functiondef(p.oid) LIKE '%sub_deducted%') AS deduct_split_felder
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'deduct_credits_atomic',
    'reset_subscription_credits_atomic',
    'add_credits_atomic'
  )
ORDER BY p.proname;

-- Fehlt eine der drei Funktionen komplett, erscheint sie oben nicht.
SELECT
  'rpc_missing' AS art,
  wanted AS name
FROM unnest(ARRAY[
  'deduct_credits_atomic',
  'reset_subscription_credits_atomic',
  'add_credits_atomic'
]) AS wanted
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = wanted
);

-- 3) HNSW-Index (migration_documents_hnsw_index.sql)
SELECT
  'index' AS art,
  indexname AS name,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ea_documents'
  AND (indexname = 'idx_ea_documents_embedding_hnsw' OR indexdef ILIKE '%hnsw%');

-- 4) RLS-Kurzstand (volles Audit: audit_rls_storage.sql)
SELECT
  'rls' AS art,
  c.relname AS name,
  c.relrowsecurity AS rls_aktiv
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'ea_%'
ORDER BY c.relrowsecurity ASC, c.relname;

-- Bewertung nach dem Lauf:
--   ea_ai_usage / ea_cron_state fehlen          -> combined.sql ausfuehren
--   reset/add_credits_atomic fehlen             -> combined.sql ausfuehren
--   deduct_credits_atomic ohne sub_deducted     -> deduct_credits_split.sql
--   kein HNSW-Index                             -> migration_documents_hnsw_index.sql
--   ea_*-Tabelle mit rls_aktiv = false          -> audit + rls_reactivate
