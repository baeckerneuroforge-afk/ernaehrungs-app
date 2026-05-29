-- =============================================================================
-- Migration: RLS auf fehlenden Tabellen + Storage-Policies
-- Audit-Finding: ea_support_tickets, ea_monthly_reports, ea_stripe_events
-- hatten keine RLS. Ueber den Anon-Key waren diese Tabellen lesbar.
--
-- Kontext: Wir nutzen Clerk, NICHT Supabase Auth. auth.uid() ist immer NULL.
-- Alle Server-Queries laufen ueber createSupabaseAdmin() (Service Role,
-- bypassed RLS). Diese Policies sind Defense-in-Depth gegen Anon-Key-Zugriff.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ea_support_tickets: nur Service Role + Admin-Lesezugriff
-- ---------------------------------------------------------------------------
ALTER TABLE ea_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read support tickets" ON ea_support_tickets;
CREATE POLICY "Admins read support tickets"
  ON ea_support_tickets
  FOR SELECT
  USING (is_admin());

-- Kein INSERT/UPDATE/DELETE fuer Anon/Authenticated — nur Service Role.

-- ---------------------------------------------------------------------------
-- 2. ea_monthly_reports: nur Service Role + Admin-Lesezugriff
-- ---------------------------------------------------------------------------
ALTER TABLE ea_monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read monthly reports" ON ea_monthly_reports;
CREATE POLICY "Admins read monthly reports"
  ON ea_monthly_reports
  FOR SELECT
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- 3. ea_stripe_events: nur Service Role (keine Policies = kein Anon-Zugriff)
-- ---------------------------------------------------------------------------
ALTER TABLE ea_stripe_events ENABLE ROW LEVEL SECURITY;
-- Keine Policies: Anon/Authenticated haben keinen Zugriff.
-- Service Role bypassed RLS.

-- ---------------------------------------------------------------------------
-- 4. Storage-Policies fuer food-photos Bucket
-- Uploads und signedUrl-Erzeugung laufen ueber createSupabaseAdmin()
-- (Service Role). Diese Policies blocken den Anon-Key komplett.
-- Service Role bypassed storage RLS automatisch.
-- ---------------------------------------------------------------------------

-- Bestehende Policies aufräumen (idempotent)
DROP POLICY IF EXISTS "Block anon upload"  ON storage.objects;
DROP POLICY IF EXISTS "Block anon read"    ON storage.objects;
DROP POLICY IF EXISTS "Block anon delete"  ON storage.objects;

-- Anon/Authenticated duerfen NICHTS im food-photos Bucket.
-- (Keine permissive Policy = implizites Deny bei aktiviertem RLS.)
-- Storage objects hat RLS bereits standardmaessig aktiviert.
-- Wir brauchen keine explizite "deny"-Policy — das Fehlen einer
-- permissive Policy genuegt. Dieser Kommentar dokumentiert die Absicht.
