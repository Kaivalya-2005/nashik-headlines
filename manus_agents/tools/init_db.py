"""
tools/init_db.py
Initialize the completely new 9-table MySQL schema for Nashik Headlines.
Adds the 'sources' table and drops existing tables to cleanly rebuild foreign keys.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mysql.connector
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT, CATEGORIES, RSS_FEEDS, SCRAPE_URLS

def _get_conn():
    return mysql.connector.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        port=MYSQL_PORT,
    )

def init_db():
    print(f"Initializing database: {MYSQL_DB}...")
    conn = _get_conn()
    cur = conn.cursor()

    cur.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DB}")
    conn.commit()
    cur.close()
    conn.close()

    conn = mysql.connector.connect(
        host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
        database=MYSQL_DB, port=MYSQL_PORT
    )
    cur = conn.cursor()

    # Drop existing tables to cleanly rebuild foreign keys for 'sources'
    tables = [
        "agent_logs", "article_images", "article_tags", 
        "processed_articles", "raw_articles", 
        "admin_users", "tags", "categories", "sources"
    ]
    for table in tables:
        cur.execute(f"DROP TABLE IF EXISTS {table}")
    print("Dropped old tables.")

    # 1. sources
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            url TEXT,
            rss_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 2. categories
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            slug VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 3. tags
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 4. admin_users
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            password_hash TEXT,
            role VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 5. raw_articles
    cur.execute("""
        CREATE TABLE IF NOT EXISTS raw_articles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_id INT,
            title TEXT,
            url TEXT,
            content LONGTEXT,
            scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'pending',
            FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 6. processed_articles
    cur.execute("""
        CREATE TABLE IF NOT EXISTS processed_articles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(500),
            summary TEXT,
            content LONGTEXT,
            category_id INT,
            source_id INT,
            original_url TEXT,
            slug VARCHAR(255),
            meta_title VARCHAR(255),
            meta_description TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            published_at DATETIME,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 7. article_tags
    cur.execute("""
        CREATE TABLE IF NOT EXISTS article_tags (
            article_id INT,
            tag_id INT,
            FOREIGN KEY (article_id) REFERENCES processed_articles(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY(article_id, tag_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 8. article_images
    cur.execute("""
        CREATE TABLE IF NOT EXISTS article_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            article_id INT,
            image_url TEXT,
            alt_text TEXT,
            caption TEXT,
            position INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (article_id) REFERENCES processed_articles(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # 9. agent_logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agent_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_name VARCHAR(255),
            message TEXT,
            article_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)

    # Indexes
    try:
        cur.execute("CREATE INDEX idx_slug ON processed_articles(slug)")
        cur.execute("CREATE INDEX idx_category ON processed_articles(category_id)")
        cur.execute("CREATE INDEX idx_status ON processed_articles(status)")
        cur.execute("CREATE INDEX idx_raw_status ON raw_articles(status)")
        cur.execute("CREATE INDEX idx_raw_url ON raw_articles(url(255))")
    except mysql.connector.Error:
        pass

    # Seed categories
    for cat_id, cat_name in CATEGORIES.items():
        cur.execute(
            "INSERT IGNORE INTO categories (id, name, slug) VALUES (%s, %s, %s)",
            (cat_id, cat_name, cat_name.lower().replace(" ", "-"))
        )

    # Seed sources dynamically from config
    for rss in RSS_FEEDS:
        name = "Times Of India" if "timesofindia" in rss else ("NDTV" if "ndtv" in rss else "RSS Feed")
        cur.execute(
            "INSERT INTO sources (name, url, rss_url) VALUES (%s, %s, %s)",
            (name, "", rss)
        )
    for url in SCRAPE_URLS:
        name = "Times Of India" if "timesofindia" in url else ("NDTV" if "ndtv" in url else "Website")
        cur.execute(
            "INSERT INTO sources (name, url, rss_url) VALUES (%s, %s, %s)",
            (name, url, "")
        )

    conn.commit()
    cur.close()
    conn.close()
    print("Database initialization complete (9 tables).")

if __name__ == "__main__":
    init_db()
