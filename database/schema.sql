-- =============================================================================
-- Nashik Headlines — PostgreSQL / Supabase full schema backup
-- =============================================================================
-- Source of truth: your live Supabase project (DATABASE_URL).
-- Use this file to:
--   • Document the full database structure
--   • Restore to a fresh Supabase project (SQL Editor → run schema.sql then seed.sql)
--   • Compare drift vs production
--
-- Navi Mumbai direct publish does NOT require article rows — only portals + publish_log.
-- =============================================================================

-- ── Extensions (Supabase usually has these) ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUM types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE article_status AS ENUM (
    'pending', 'processing', 'processed', 'duplicate', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE log_status AS ENUM ('info', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE article_publish_status AS ENUM (
    'draft', 'approved', 'published', 'scheduled', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('rss', 'html', 'api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Portals (Nashik + Navi Mumbai WordPress config) ───────────────────────────
CREATE TABLE IF NOT EXISTS portals (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  wp_api_url      TEXT,
  wp_username     TEXT,
  wp_app_password TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Scraper pipeline ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raw_articles (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(500),
  content    TEXT,
  url        VARCHAR(500) UNIQUE,
  source     VARCHAR(255),
  status     article_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_articles_status ON raw_articles(status);
CREATE INDEX IF NOT EXISTS idx_raw_articles_created_at ON raw_articles(created_at);

CREATE TABLE IF NOT EXISTS logs (
  id         SERIAL PRIMARY KEY,
  step       VARCHAR(50),
  message    TEXT,
  status     log_status,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_step ON logs(step);
CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);

-- ── Admin auth ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       user_role DEFAULT 'editor',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Taxonomy & sources ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  url        VARCHAR(500) NOT NULL,
  type       source_type DEFAULT 'rss',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Articles (Nashik site + optional WP sync metadata) ────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id              SERIAL PRIMARY KEY,

  -- Core content
  title           VARCHAR(500),
  slug            VARCHAR(255) UNIQUE,
  content         TEXT,
  summary         TEXT,
  excerpt         TEXT,

  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  source_id       INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  tags            TEXT,

  -- SEO
  seo_title           VARCHAR(255),
  meta_description    TEXT,
  keywords            TEXT,
  focus_keyword       VARCHAR(100),
  canonical_url       TEXT,
  meta_robots         VARCHAR(50) DEFAULT 'index,follow',

  -- Media
  image_url               TEXT,
  image_alt               VARCHAR(255),
  images                  JSONB DEFAULT '[]'::jsonb,
  featured_image_url      TEXT,
  featured_image_alt      TEXT,
  featured_image_caption  TEXT,

  -- Social / OG
  og_title            VARCHAR(120),
  og_description      VARCHAR(300),
  og_image            TEXT,
  twitter_title       VARCHAR(120),
  twitter_description VARCHAR(300),

  -- Scores & AI pipeline
  seo_score           INTEGER DEFAULT 0,
  quality_score       INTEGER DEFAULT 0,
  readability_score   INTEGER DEFAULT 0,
  ai_confidence       INTEGER DEFAULT 0,
  needs_review        BOOLEAN DEFAULT FALSE,
  quality_warnings    TEXT DEFAULT '[]',
  raw_article_id      INTEGER,
  ai_generated        BOOLEAN DEFAULT FALSE,
  ai_improved         BOOLEAN DEFAULT FALSE,
  ai_summary          TEXT,
  ai_model            VARCHAR(50),

  -- Publishing
  status              article_publish_status DEFAULT 'draft',
  publish_to          VARCHAR(20) DEFAULT 'nashik',
  language            VARCHAR(5) DEFAULT 'mr',
  article_type        VARCHAR(20) DEFAULT 'news',
  priority            VARCHAR(10) DEFAULT 'normal',
  city                VARCHAR(50) DEFAULT 'nashik',
  region              VARCHAR(50) DEFAULT 'maharashtra',
  author_name         VARCHAR(100),
  reporter_name       VARCHAR(100),
  byline              TEXT,
  scheduled_at        TIMESTAMPTZ,
  sticky              BOOLEAN DEFAULT FALSE,
  format              VARCHAR(20) DEFAULT 'standard',

  -- WordPress sync (Navi Mumbai / Nashik WP if used)
  wp_nashik_post_id       INTEGER,
  wp_navimumbai_post_id   INTEGER,
  wp_nashik_status        VARCHAR(20) DEFAULT 'pending',
  wp_navimumbai_status    VARCHAR(20) DEFAULT 'pending',
  wp_last_synced_at       TIMESTAMPTZ,
  wp_author_id            INTEGER,
  wp_featured_media_id    INTEGER,

  -- Analytics
  views           INTEGER DEFAULT 0,
  trending_score  DOUBLE PRECISION DEFAULT 0,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ,

  -- Full-text search
  search_vector   TSVECTOR
);

-- ── Publish log (article_id NULL = direct Navi Mumbai WP draft, no DB article) ─
CREATE TABLE IF NOT EXISTS publish_log (
  id          SERIAL PRIMARY KEY,
  article_id  INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  portal      VARCHAR(30),
  action      VARCHAR(30),
  wp_post_id  INTEGER,
  wp_url      TEXT,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IMPORTANT: If live database has NOT NULL constraint on article_id, remove it:
--   ALTER TABLE publish_log ALTER COLUMN article_id DROP NOT NULL;
-- This allows direct-to-WordPress publishing without a local article record.

-- Article revisions (edit history)
CREATE TABLE IF NOT EXISTS article_revisions (
  id                SERIAL PRIMARY KEY,
  article_id        INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  content           TEXT NOT NULL,
  seo_title         VARCHAR(255),
  meta_description  TEXT,
  keywords          TEXT,
  slug              VARCHAR(255),
  seo_score         INTEGER DEFAULT 0,
  quality_score     INTEGER DEFAULT 0,
  readability_score INTEGER DEFAULT 0,
  ai_confidence     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_revisions_article ON article_revisions(article_id);

-- ── Analytics (Next.js view tracking) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics (
  id         SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  view_date  DATE NOT NULL,
  views      INTEGER DEFAULT 0,
  UNIQUE (article_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(view_date);
CREATE INDEX IF NOT EXISTS idx_analytics_article ON analytics(article_id);

-- ── Articles indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_publish_to ON articles(publish_to);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_city ON articles(city);
CREATE INDEX IF NOT EXISTS idx_articles_priority ON articles(priority);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON articles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_articles_trending ON articles(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_publish_log_article ON publish_log(article_id);

-- Allow NULL article_id on publish_log (direct Navi Mumbai WP draft)
ALTER TABLE publish_log ALTER COLUMN article_id DROP NOT NULL;

-- ── Full-text search trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      COALESCE(NEW.title, '') || ' ' ||
      COALESCE(NEW.content, '') || ' ' ||
      COALESCE(NEW.summary, '')
    );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update ON articles;
CREATE TRIGGER tsvector_update
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ── Row Level Security (Supabase) ─────────────────────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON articles;
CREATE POLICY "Allow all" ON articles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can read published articles" ON articles;
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (status = 'published');
