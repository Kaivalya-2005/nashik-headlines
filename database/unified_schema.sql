CREATE TABLE raw_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT,
  content LONGTEXT,
  url TEXT UNIQUE,
  source VARCHAR(255),
  status ENUM('pending','processed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT,
  content LONGTEXT,
  summary TEXT,
  category VARCHAR(100),
  tags TEXT,
  seo_title TEXT,
  meta_description TEXT,
  slug VARCHAR(255),
  keywords TEXT,
  image_url TEXT,
  image_alt TEXT,
  seo_score INT DEFAULT 0,
  status ENUM('draft','approved','published') DEFAULT 'draft',
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step VARCHAR(50),
  message TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);