-- CREATE TABLE raw_articles (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   title VARCHAR(500),
--   content LONGTEXT,
--   url VARCHAR(500) UNIQUE,
--   source VARCHAR(255),
--   status ENUM('pending','processing','processed','duplicate','failed') DEFAULT 'pending',
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   INDEX (status),
--   INDEX (created_at)
-- );

-- CREATE TABLE logs (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   step VARCHAR(50),
--   message TEXT,
--   status ENUM('info','warning','error'),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   INDEX (step),
--   INDEX (status)
-- );

-- CREATE TABLE admin_users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   username VARCHAR(100) UNIQUE NOT NULL,
--   password VARCHAR(255) NOT NULL,
--   role ENUM('admin','editor') DEFAULT 'editor',
--   last_login TIMESTAMP NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE categories (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   slug VARCHAR(100) UNIQUE NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE sources (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   url VARCHAR(500) NOT NULL,
--   type ENUM('rss', 'html', 'api') DEFAULT 'rss',
--   is_active BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE articles (
--   id INT AUTO_INCREMENT PRIMARY KEY,

--   title VARCHAR(500),
--   slug VARCHAR(255) UNIQUE,

--   content LONGTEXT,
--   summary TEXT,

--   category_id INT,
--   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,

--   tags TEXT,

--   seo_title VARCHAR(255),
--   meta_description TEXT,
--   keywords TEXT,

--   image_url TEXT,
--   image_alt VARCHAR(255),

--   seo_score INT DEFAULT 0,

--   quality_score INT DEFAULT 0,
--   readability_score INT DEFAULT 0,
--   ai_confidence INT DEFAULT 0,

--   status ENUM('draft','approved','published') DEFAULT 'draft',

--   source_id INT,
--   FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,

--   views INT DEFAULT 0,

--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   published_at TIMESTAMP NULL,

--   INDEX (slug),
--   INDEX (status),
--   INDEX (published_at),
--   FULLTEXT(title, content, summary)
-- );

-- CREATE TABLE analytics (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   article_id INT NOT NULL,
--   view_date DATE NOT NULL,
--   views INT DEFAULT 0,
  
--   UNIQUE KEY unique_article_date (article_id, view_date),
--   FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
--   INDEX (view_date),
--   INDEX (article_id)
-- );

-- -- Insert default admin user: admin@example.com / admin123
-- INSERT INTO admin_users (username, password, role) 
-- VALUES ('admin@example.com', '$2b$10$mVT20YiRNrQbUnnGkdU1O.sbeYNX/H4Y3AJKrCeFtC/MtRDiJacHa', 'admin');


CREATE TYPE article_status AS ENUM ('pending','processing','processed','duplicate','failed');
CREATE TYPE log_status AS ENUM ('info','warning','error');
CREATE TYPE user_role AS ENUM ('admin','editor');
CREATE TYPE article_publish_status AS ENUM ('draft','approved','published');
CREATE TYPE source_type AS ENUM ('rss','html','api');

CREATE TABLE raw_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  content TEXT,
  url VARCHAR(500) UNIQUE,
  source VARCHAR(255),
  status article_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_raw_articles_status ON raw_articles(status);
CREATE INDEX idx_raw_articles_created_at ON raw_articles(created_at);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  step VARCHAR(50),
  message TEXT,
  status log_status,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_step ON logs(step);
CREATE INDEX idx_logs_status ON logs(status);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'editor',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  type source_type DEFAULT 'rss',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articles (
  id SERIAL PRIMARY KEY,

  title VARCHAR(500),
  slug VARCHAR(255) UNIQUE,

  content TEXT,
  summary TEXT,

  category_id INT REFERENCES categories(id) ON DELETE SET NULL,

  tags TEXT,

  seo_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT,

  image_url TEXT,
  image_alt VARCHAR(255),
  images JSONB DEFAULT '[]'::jsonb,

  seo_score INT DEFAULT 0,

  quality_score INT DEFAULT 0,
  readability_score INT DEFAULT 0,
  ai_confidence INT DEFAULT 0,

  status article_publish_status DEFAULT 'draft',

  source_id INT REFERENCES sources(id) ON DELETE SET NULL,

  views INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL
);

ALTER TABLE articles ADD COLUMN search_vector tsvector;

CREATE INDEX idx_articles_search 
ON articles USING GIN(search_vector);

-- auto update trigger
CREATE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      COALESCE(NEW.title,'') || ' ' ||
      COALESCE(NEW.content,'') || ' ' ||
      COALESCE(NEW.summary,'')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TABLE analytics (
  id SERIAL PRIMARY KEY,
  article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  views INT DEFAULT 0,
  
  UNIQUE (article_id, view_date)
);

CREATE INDEX idx_analytics_date ON analytics(view_date);
CREATE INDEX idx_analytics_article ON analytics(article_id);

INSERT INTO admin_users (username, password, role) 
VALUES (
  'nashikheadlines@gmail.com',
  '$2b$12$ZzdWQlJhEDvNp8rmgMVwIOKhQnuAk56/j94l98Q5EaEpifLqV/8Gu',
  'admin'
);

--RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON articles FOR ALL USING (true);


ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
ON articles
FOR SELECT
USING (status = 'published');
