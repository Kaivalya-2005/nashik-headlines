"""
tools/store_article.py
Tool: store_article(article: dict) -> dict
Writes processed article to SQLite with status='draft'.
Auto-creates the table on first run.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import sqlite3, json
from datetime import datetime
from config.settings import DB_PATH
from memory.store import mark_processed, log_error


def init_db():
    """Ensure the articles table exists."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            url              TEXT    UNIQUE NOT NULL,
            source           TEXT,
            title            TEXT,
            rewritten_body   TEXT,
            summary          TEXT,
            category         TEXT DEFAULT 'local',
            slug             TEXT,
            meta_title       TEXT,
            meta_description TEXT,
            keywords         TEXT,
            image_prompt     TEXT,
            image_url        TEXT,
            status           TEXT DEFAULT 'draft',
            created_at       TEXT
        )
    """)
    conn.commit()
    conn.close()


def store_article(article: dict) -> dict:
    """
    Input:  fully processed article dict
    Output: same dict + 'db_id' (int, -1 on failure)
    """
    url = article.get("url", "")
    if not url:
        return {**article, "db_id": -1}

    try:
        init_db()
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute("""
            INSERT OR IGNORE INTO articles
              (url, source, title, rewritten_body, summary, category,
               slug, meta_title, meta_description, keywords,
               image_prompt, image_url, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            url,
            article.get("source", ""),
            article.get("title", ""),
            article.get("rewritten_body", ""),
            article.get("summary", ""),
            article.get("category", "local"),
            article.get("slug", ""),
            article.get("meta_title", ""),
            article.get("meta_description", ""),
            json.dumps(article.get("keywords", [])),
            article.get("image_prompt", ""),
            article.get("image_url", ""),
            "draft",
            datetime.utcnow().isoformat(),
        ))
        conn.commit()
        db_id = cur.lastrowid or -1
        conn.close()
        mark_processed(url)
        print(f"[store_article] ✓ Saved id={db_id} status=draft")
        return {**article, "db_id": db_id}
    except sqlite3.Error as exc:
        log_error("publisher_agent", str(exc))
        print(f"[store_article] ✗ DB error: {exc}")
        return {**article, "db_id": -1}


def fetch_articles(limit: int = 20, category: str | None = None, status: str | None = None) -> list[dict]:
    """Read articles back from DB for admin panel / API."""
    try:
        init_db()
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        where, params = [], []
        if category:
            where.append("category=?"); params.append(category)
        if status:
            where.append("status=?");   params.append(status)
        clause = ("WHERE " + " AND ".join(where)) if where else ""
        rows = conn.execute(
            f"SELECT * FROM articles {clause} ORDER BY id DESC LIMIT ?",
            (*params, limit)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except sqlite3.Error as exc:
        log_error("publisher_agent", str(exc))
        return []
