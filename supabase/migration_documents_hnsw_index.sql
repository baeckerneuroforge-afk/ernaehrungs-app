-- P3 — HNSW-Vektor-Index auf ea_documents.embedding.
--
-- Ohne diesen Index macht ea_match_documents (embedding <=> query_embedding)
-- einen Full Scan ueber ALLE Chunks — und RAG laeuft in Chat, Review und
-- Weekly-Coaching. Mit HNSW skaliert die Suche logarithmisch statt linear.
--
-- vector_cosine_ops passt zum Cosine-Distance-Operator <=> in der RPC.
-- Idempotent. Im Supabase SQL-Editor des Nutriva-Projekts ausfuehren.
-- (Der Indexaufbau kann bei vielen Rows kurz dauern — laeuft aber einmalig.)

CREATE INDEX IF NOT EXISTS idx_ea_documents_embedding_hnsw
  ON ea_documents
  USING hnsw (embedding vector_cosine_ops);

ANALYZE ea_documents;
