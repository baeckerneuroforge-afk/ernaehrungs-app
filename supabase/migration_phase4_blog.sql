-- ============================================
-- Ernährungs-App Phase 4: Blog Feature
-- ============================================

-- 1. Blog Posts Tabelle
CREATE TABLE IF NOT EXISTS ea_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  excerpt text,
  category text,
  meta_description text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  in_wissensbasis boolean DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_ea_blog_posts_slug ON ea_blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_ea_blog_posts_status ON ea_blog_posts(status, published_at DESC);

-- 3. RLS
ALTER TABLE ea_blog_posts ENABLE ROW LEVEL SECURITY;

-- Jeder kann veröffentlichte Posts lesen (für SEO + öffentlichen Blog)
CREATE POLICY "public_read_published" ON ea_blog_posts
  FOR SELECT USING (status = 'published');

-- Admins haben vollen Zugriff auf alle Posts
CREATE POLICY "admin_full_access" ON ea_blog_posts
  FOR ALL USING (ea_is_admin()) WITH CHECK (ea_is_admin());
