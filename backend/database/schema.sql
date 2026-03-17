CREATE DATABASE IF NOT EXISTS nashik_headlines;
USE nashik_headlines;

CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor') DEFAULT 'editor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS raw_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    source VARCHAR(255),
    url VARCHAR(500) UNIQUE,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS processed_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT,
    content LONGTEXT,
    category_id INT,
    status ENUM('draft', 'pending_review', 'approved', 'published', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS article_tags (
    article_id INT,
    tag_id INT,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES processed_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS article_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    alt_text VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NULL,
    agent_name VARCHAR(100) NOT NULL,
    status ENUM('started', 'completed', 'failed') NOT NULL,
    log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES raw_articles(id) ON DELETE SET NULL
);
