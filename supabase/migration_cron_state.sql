-- =============================================================================
-- Migration: ea_cron_state — Checkpoint-Tabelle für paginierte Cron-Jobs
-- Audit-Finding: weekly-coaching und monthly-report luden ALLE Premium-User
-- auf einmal und verarbeiteten sie sequentiell. Bei vielen Usern droht
-- Timeout (maxDuration 300s) → ein Teil der User bekommt keine Mail, und der
-- Cron-Lauf meldet trotzdem "ok".
--
-- Lösung: Die Jobs verarbeiten pro Lauf Batches ab dem gespeicherten
-- Checkpoint (sortiert nach clerk_id) und schreiben den Fortschritt zurück.
-- Timeout/Crash mitten im Lauf → der nächste Lauf setzt am Checkpoint fort,
-- sodass über mehrere Läufe garantiert alle User drankommen.
--
-- Kontext: Wir nutzen Clerk, NICHT Supabase Auth. auth.uid() ist immer NULL.
-- Zugriff ausschließlich über createSupabaseAdmin() (Service Role).
-- =============================================================================

CREATE TABLE IF NOT EXISTS ea_cron_state (
  job_name text PRIMARY KEY,
  -- Letzte verarbeitete clerk_id. '' = Zyklus-Start (alle User ab Anfang).
  last_processed_user_id text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nur Service Role: RLS an, KEINE Policies = kein Anon/Authenticated-Zugriff.
ALTER TABLE ea_cron_state ENABLE ROW LEVEL SECURITY;
-- Keine Policies: Service Role bypassed RLS, alle anderen werden geblockt.
