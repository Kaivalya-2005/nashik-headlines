"""
tools/store_article.py
Writes processed article to MySQL.
Now includes source_id foreign key mapping for processed_articles.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mysql.connector
from datetime import datetime
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
from memory.store import log_error


def _get_conn():
    return mysql.connector.connect(
        host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
        database=MYSQL_DB, port=MYSQL_PORT
    )


def store_article(article: dict) -> dict:
    url = article.get("url", "")
    if not url: return {**article, "db_id": -1}

    try:
        conn = _get_conn()
        cur = conn.cursor()

        # Insert into processed_articles using source_id
        cur.execute("""
            INSERT INTO processed_articles
              (title, summary, content, category_id, source_id, original_url, slug,
               status, meta_title, meta_description, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,  %s,%s,%s,%s,%s)
        """, (
            article.get("title", ""),
            article.get("summary", ""),
            article.get("rewritten_body", ""),
            article.get("category_id", 10),
            article.get("source_id", None),  # Pass the FK fetched by Scraper
            article.get("url", ""),          # original_url (the url fetched)
            article.get("slug", ""),
            "draft",
            article.get("meta_title", ""),
            article.get("meta_description", ""),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        ))
        
        proc_id = cur.lastrowid
        
        # Insert tags
        keywords = article.get("keywords", [])
        for kw in keywords:
            kw = kw.strip().lower()
            if not kw: continue
            cur.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (kw,))
            cur.execute("SELECT id FROM tags WHERE name = %s", (kw,))
            row = cur.fetchone()
            if row:
                cur.execute("INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (%s, %s)", (proc_id, row[0]))

        # Insert article_images
        prompts = article.get("image_prompts", [])
        image_paths = [article.get("image1"), article.get("image2"), article.get("image3")]
        
        for idx in range(3):
            path = image_paths[idx] if idx < len(image_paths) else None
            if not path: continue
            
            alt = prompts[idx].get("alt_text", "") if idx < len(prompts) else ""
            cap = prompts[idx].get("caption", "") if idx < len(prompts) else ""
                
            cur.execute("""
                INSERT INTO article_images (article_id, image_url, alt_text, caption, position)
                VALUES (%s, %s, %s, %s, %s)
            """, (proc_id, path, alt, cap, idx + 1))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[store_article] ✓ Saved id={proc_id} status=draft")
        return {**article, "db_id": proc_id}

    except mysql.connector.Error as exc:
        log_error("publisher_agent", str(exc))
        print(f"[store_article] ✗ DB error: {exc}")
        return {**article, "db_id": -1}


def fetch_articles(limit=20, category_id=None, status=None):
    try:
        conn = _get_conn()
        cur = conn.cursor(dictionary=True)
        where, params = [], []
        if category_id:
            where.append("category_id=%s"); params.append(category_id)
        if status:
            where.append("status=%s"); params.append(status)
        clause = ("WHERE " + " AND ".join(where)) if where else ""
        cur.execute(f"SELECT * FROM processed_articles {clause} ORDER BY id DESC LIMIT %s", (*params, limit))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except mysql.connector.Error as exc:
        log_error("publisher_agent", str(exc))
        return []


def update_article_status(article_id: int, status: str) -> bool:
    try:
        conn = _get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE processed_articles SET status=%s WHERE id=%s", (status, article_id))
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return affected > 0
    except mysql.connector.Error as exc:
        log_error("publisher_agent", str(exc))
        return False
