-- ============================================
-- Ernährungs-App: Datenbank-Migration
-- Prefix: ea_ (um Konflikte mit bestehenden Tabellen zu vermeiden)
-- ============================================

-- pgvector Extension (falls noch nicht aktiviert)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. Nutzer-Profile
-- ============================================
CREATE TABLE IF NOT EXISTS ea_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text,
  alter_jahre integer,
  geschlecht text CHECK (geschlecht IN ('weiblich', 'maennlich', 'divers')),
  groesse_cm integer,
  gewicht_kg numeric(5,1),
  ziel text CHECK (ziel IN ('abnehmen', 'zunehmen', 'halten', 'muskelaufbau', 'gesuender')),
  allergien text[] DEFAULT '{}',
  ernaehrungsform text CHECK (ernaehrungsform IN ('alles', 'vegetarisch', 'vegan', 'pescetarisch', 'keto', 'lowcarb')),
  krankheiten text,
  aktivitaet text CHECK (aktivitaet IN ('wenig', 'moderat', 'aktiv', 'sehr_aktiv')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Nutzer sehen nur eigenes Profil
ALTER TABLE ea_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON ea_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON ea_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON ea_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Wissensbasis-Dokumente (RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS ea_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  source text,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- RLS: Jeder kann lesen (fuer RAG-Suche), nur Service Role kann schreiben
ALTER TABLE ea_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read documents"
  ON ea_documents FOR SELECT
  USING (true);

CREATE POLICY "Auth users can insert documents"
  ON ea_documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can delete documents"
  ON ea_documents FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. Chat-Verläufe
-- ============================================
CREATE TABLE IF NOT EXISTS ea_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL DEFAULT gen_random_uuid()::text,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS: Nutzer sehen nur eigene Chats
ALTER TABLE ea_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON ea_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ea_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index fuer schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_ea_conversations_user_session
  ON ea_conversations(user_id, session_id, created_at);

-- ============================================
-- 4. Vektor-Suche RPC
-- ============================================
CREATE OR REPLACE FUNCTION ea_match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea_documents.id,
    ea_documents.title,
    ea_documents.content,
    ea_documents.source,
    1 - (ea_documents.embedding <=> query_embedding) AS similarity
  FROM ea_documents
  WHERE ea_documents.embedding IS NOT NULL
    AND 1 - (ea_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY ea_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
