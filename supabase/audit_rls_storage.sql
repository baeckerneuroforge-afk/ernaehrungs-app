-- =============================================================================
-- A7 — RLS-/Storage-Policy-Audit (read-only)
--
-- Im Supabase SQL-Editor des NUTRIVA-Projekts (mdwavlbypkvkaxysoerc) ausfuehren.
-- Aendert NICHTS — nur SELECTs. Zweck: in Produktion verifizieren, dass der
-- Defense-in-Depth-Zustand (RLS aktiv, Storage privat) wirklich vorliegt.
-- Hintergrund: Der Server nutzt durchgaengig den Service-Role-Key (bypassed
-- RLS), daher ist RLS reine zweite Verteidigungslinie — sie sollte trotzdem
-- ueberall aktiv sein, falls je der Anon-Key/ein Direktzugriff durchkommt.
-- =============================================================================

-- 1) RLS-Status aller ea_-Tabellen. Erwartet: rowsecurity = true ueberall.
SELECT
  c.relname               AS tabelle,
  c.relrowsecurity        AS rls_aktiv,
  c.relforcerowsecurity   AS rls_erzwungen
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'ea_%'
ORDER BY c.relrowsecurity ASC, c.relname;   -- Tabellen OHNE RLS stehen oben

-- 2) Vorhandene Policies pro ea_-Tabelle. Erwartet: jede personenbezogene
--    Tabelle hat mindestens eine SELECT/INSERT/UPDATE/DELETE-Policy, die auf
--    den Clerk-User (JWT-sub) einschraenkt — nicht "USING (true)".
SELECT
  tablename,
  policyname,
  cmd          AS operation,
  qual         AS using_ausdruck,
  with_check   AS check_ausdruck
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ea_%'
ORDER BY tablename, cmd;

-- 3) ea_-Tabellen MIT aktivem RLS aber OHNE jede Policy = faktisch gesperrt
--    fuer Nicht-Service-Role (oder ein vergessener Zustand). Auffaellig pruefen.
SELECT c.relname AS tabelle_mit_rls_ohne_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'ea_%'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- 4) Storage-Buckets. Erwartet: food-photos.public = false (privat).
SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY name;

-- 5) Storage-Policies auf den Objekten (food-photos). Erwartet: kein
--    oeffentlicher Lesezugriff; Zugriff nur ueber Service-Role/Owner.
SELECT
  policyname,
  cmd            AS operation,
  qual           AS using_ausdruck,
  with_check     AS check_ausdruck
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- 6) Sicherheitscheck: existiert ueberhaupt ein HNSW/IVFFlat-Index auf
--    ea_documents.embedding? (Relevant fuer P3 Performance, hier nur Info.)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'ea_documents';

-- ---------------------------------------------------------------------------
-- Bewertung:
--   - Schritt 1: Steht eine ea_-Tabelle auf rls_aktiv = false -> RLS dort
--     reaktivieren (siehe supabase/migration_rls_reactivate.sql).
--   - Schritt 2/3: Policies mit "USING (true)" auf personenbezogenen Tabellen
--     sind zu weit; ea_documents darf oeffentlich lesbar sein (RAG), Nutzer-
--     daten NICHT.
--   - Schritt 4: food-photos MUSS public = false sein.
--   - Schritt 5: Keine "allow all"-Storage-Policy fuer food-photos.
-- ---------------------------------------------------------------------------
