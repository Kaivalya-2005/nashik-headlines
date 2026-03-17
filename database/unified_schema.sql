-- =========================================
-- UNIFIED NASHIK HEADLINES MYSQL SCHEMA
-- Single database for entire project
-- =========================================

-- 1. USERS TABLE (Admin/Editors)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'EDITOR') DEFAULT 'EDITOR',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(email),
    INDEX(role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. RSS SOURCES TABLE
CREATE TABLE sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) UNIQUE NOT NULL,
    feed_type ENUM('RSS', 'WEB_SCRAPE') DEFAULT 'RSS',
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(is_active),
    INDEX(feed_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. RAW ARTICLES TABLE (from scraping)
CREATE TABLE raw_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    source_id INT NOT NULL,
    url VARCHAR(500) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    raw_html LONGTEXT,
    published_date DATETIME NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    INDEX(source_id),
    INDEX(processed),
    INDEX(url),
    INDEX(published_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ARTICLES TABLE (Main content)
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Identification
    raw_article_id INT,
    external_url VARCHAR(500),
    
    -- Content
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(255),
    content LONGTEXT,
    summary LONGTEXT,
    language VARCHAR(10) DEFAULT 'mr',
    
    -- Status & Workflow
    status ENUM(
        'DRAFT_SCRAPED',      -- Auto-generated from scraping
        'DRAFT_EDITED',       -- Editor made changes
        'PENDING_APPROVAL',   -- Ready for review
        'APPROVED',           -- Admin approved
        'PUBLISHED',          -- Live on frontend
        'REJECTED'            -- Not approved
    ) DEFAULT 'DRAFT_SCRAPED',
    
    -- Generation & Processing
    generation_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'COMPLETED',
    generation_error TEXT,
    generation_started_at TIMESTAMP NULL,
    generation_completed_at TIMESTAMP NULL,
    
    -- AI Processing
    focus_keyphrase VARCHAR(255),
    quote_block LONGTEXT,
    source_name VARCHAR(255),
    source_url VARCHAR(500),
    via_name VARCHAR(255),
    via_url VARCHAR(500),
    
    -- SEO Data
    seo_title VARCHAR(255),
    seo_description VARCHAR(255),
    seo_slug VARCHAR(255) UNIQUE,
    seo_keywords JSON,
    seo_score INT DEFAULT 0,
    seo_report JSON,
    
    -- WordPress Integration
    wp_id INT,
    wp_url VARCHAR(500),
    
    -- User Attribution
    created_by INT NOT NULL,
    updated_by INT,
    approved_by INT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    -- Indexes for performance
    FOREIGN KEY (raw_article_id) REFERENCES raw_articles(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX(status),
    INDEX(generation_status),
    INDEX(published_at),
    INDEX(created_at),
    INDEX(seo_slug),
    INDEX(wp_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CATEGORIES TABLE
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ARTICLE CATEGORIES (Many-to-Many)
CREATE TABLE article_categories (
    article_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (article_id, category_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TAGS TABLE
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    frequency INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(slug),
    INDEX(frequency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ARTICLE TAGS (Many-to-Many)
CREATE TABLE article_tags (
    article_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX(tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. IMAGES TABLE
CREATE TABLE images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    
    -- Image Metadata
    filename VARCHAR(500),
    url VARCHAR(500),
    local_path VARCHAR(500),
    mime_type VARCHAR(100),
    file_size INT,
    
    -- Image Properties
    type ENUM('feature', 'context', 'supporting', 'additional') DEFAULT 'feature',
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Content
    alt_text_marathi VARCHAR(255),
    alt_text_english VARCHAR(255),
    caption_marathi LONGTEXT,
    caption_english LONGTEXT,
    description LONGTEXT,
    
    -- AI Generation
    image_prompt LONGTEXT,
    generation_method ENUM('SDXL', 'STABILITY_API', 'UNSPLASH', 'UPLOAD', 'PLACEHOLDER') DEFAULT 'UPLOAD',
    
    -- WordPress
    wp_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX(article_id),
    INDEX(type),
    INDEX(is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. CUSTOM LABELS TABLE
CREATE TABLE custom_labels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    url VARCHAR(500),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX(article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AGENT LOGS TABLE (Audit Trail)
CREATE TABLE agent_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    agent_name VARCHAR(100) NOT NULL,
    operation VARCHAR(255) NOT NULL,
    raw_article_id INT,
    article_id INT,
    status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
    error_message TEXT,
    details JSON,
    duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raw_article_id) REFERENCES raw_articles(id),
    FOREIGN KEY (article_id) REFERENCES articles(id),
    INDEX(agent_name),
    INDEX(status),
    INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. AGENT EXECUTION LOGS & CONTROL TABLE
CREATE TABLE agent_executions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Execution Info
    execution_type ENUM('SCRAPE', 'PROCESS', 'FULL_PIPELINE') DEFAULT 'SCRAPE',
    status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'STOPPED') DEFAULT 'PENDING',
    
    -- Timing
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    duration_seconds INT,
    
    -- Results
    articles_scraped INT DEFAULT 0,
    articles_processed INT DEFAULT 0,
    articles_failed INT DEFAULT 0,
    error_message LONGTEXT,
    
    -- Control
    initiated_by INT,
    can_pause BOOLEAN DEFAULT TRUE,
    can_stop BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    INDEX(status),
    INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. BOOKMARKS TABLE (User bookmarks)
CREATE TABLE bookmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX(user_id),
    INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. API TOKENS TABLE (For external integrations)
CREATE TABLE api_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX(token_hash),
    INDEX(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. ADMIN SETTINGS TABLE
CREATE TABLE admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value LONGTEXT,
    setting_type ENUM('STRING', 'INT', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX(setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEEDING: Default Categories
INSERT INTO categories (name, slug, description, display_order) VALUES
('राजकारण', 'politics', 'राजकीय बातमी', 1),
('क्रीडा', 'sports', 'खेल बातमी', 2),
('अर्थव्यवस्था', 'economy', 'आर्थिक बातमी', 3),
('तंत्रज्ञान', 'technology', 'तंत्रज्ञान बातमी', 4),
('स्वास्थ्य', 'health', 'स्वास्थ्य संबंधी बातमी', 5),
('शिक्षा', 'education', 'शिक्षा संबंधी बातमी', 6),
('मनोरंजन', 'entertainment', 'मनोरंजन बातमी', 7),
('जीवनशैली', 'lifestyle', 'जीवनशैली बातमी', 8),
('व्यवसाय', 'business', 'व्यवसाय संबंधी बातमी', 9),
('समाज', 'society', 'समाज संबंधी बातमी', 10)
ON DUPLICATE KEY UPDATE id=id;

-- SEEDING: Default Admin Settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('scrape_interval_minutes', '30', 'INT', 'How often to run scraping (in minutes)'),
('auto_approve_articles', 'false', 'BOOLEAN', 'Auto-approve scraped articles'),
('default_approval_delay_hours', '24', 'INT', 'Hours before article auto-approval'),
('enable_image_generation', 'true', 'BOOLEAN', 'Enable AI image generation'),
('wordpress_api_enabled', 'false', 'BOOLEAN', 'Enable WordPress integration'),
('max_concurrent_scrapes', '5', 'INT', 'Max parallel scraping sources'),
('gemini_api_key', '', 'STRING', 'Google Gemini API key'),
('stability_api_key', '', 'STRING', 'Stability AI API key'),
('unsplash_api_key', '', 'STRING', 'Unsplash API key')
ON DUPLICATE KEY UPDATE id=id;

-- Create INDEXES for faster queries
CREATE INDEX idx_articles_status_created ON articles(status, created_at DESC);
CREATE INDEX idx_articles_created_by ON articles(created_by, created_at DESC);
CREATE INDEX idx_raw_articles_processed_source ON raw_articles(processed, source_id);

-- =========================================
-- End of Schema
-- =========================================
