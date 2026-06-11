-- A3: Foto-Pfade statt langlebiger Signed-URLs.
--
-- Bisher speicherte ea_food_log.photo_url eine 1 Jahr gueltige Signed-URL
-- (DSGVO-/Leak-Risiko, da Essensfotos Gesundheitsdaten sind). Neu: nur noch der
-- Storage-Pfad (photo_path); die App erzeugt kurzlebige Signed-URLs on demand
-- ueber /api/food-log/photo.
--
-- Idempotent. Im Supabase SQL-Editor des Nutriva-Projekts ausfuehren.

ALTER TABLE ea_food_log ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Backfill: Pfad aus bestehenden Signed-URLs extrahieren.
-- Format: <base>/storage/v1/object/sign/food-photos/<path>?token=...
-- substring(... from 'regex') liefert die erste Capture-Gruppe = <path>.
UPDATE ea_food_log
SET photo_path = substring(photo_url FROM '/food-photos/([^?]+)')
WHERE photo_url IS NOT NULL
  AND photo_path IS NULL
  AND photo_url LIKE '%/food-photos/%';

-- photo_url bleibt vorerst als Fallback fuer nicht backfillbare Altdaten
-- erhalten (laeuft nach max. 1 Jahr ohnehin aus). Spaeter droppbar via:
--   ALTER TABLE ea_food_log DROP COLUMN photo_url;
