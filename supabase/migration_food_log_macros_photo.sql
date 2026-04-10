-- Erweitert ea_food_log um Makros, Uhrzeit und Foto-Referenz.
-- Idempotent: kann mehrfach ausgeführt werden.

ALTER TABLE ea_food_log
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC,
  ADD COLUMN IF NOT EXISTS carbs_g   NUMERIC,
  ADD COLUMN IF NOT EXISTS fat_g     NUMERIC,
  ADD COLUMN IF NOT EXISTS uhrzeit   TIME,
  ADD COLUMN IF NOT EXISTS source    TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Source-Constraint separat, weil ADD CONSTRAINT IF NOT EXISTS nicht portabel ist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ea_food_log_source_check'
  ) THEN
    ALTER TABLE ea_food_log
      ADD CONSTRAINT ea_food_log_source_check
      CHECK (source IN ('manual', 'photo'));
  END IF;
END $$;

-- Storage-Bucket für Food-Fotos (privat, signed URLs).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;
