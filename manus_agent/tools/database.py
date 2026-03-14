"""
database.py
-----------
Saves a fully processed article to a local SQLite database.
The schema is automatically created on first run.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from config.model_config import DB_PATH
from memory.memory_manager import log_error, mark_processed


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            url              TEXT    UNIQUE NOT NULL,
            source           TEXT,
            original_title   TEXT,
            rewritten_body   TEXT,
            summary          TEXT,
            category         TEXT,
            seo_title        TEXT,
            meta_description TEXT,
            keywords         TEXT,
            processed_at     TEXT
        )
    """)
    conn.commit()


def save_to_database(article: dict) -> dict:
    """
    Persist an article dict to SQLite.

    Returns
    -------
    Same dict with 'db_id' key added (or -1 on failure).
    """
    url = article.get("url", "")
    if not url:
        return {**article, "db_id": -1}

    try:
        conn = _get_connection()
        _ensure_table(conn)

        keywords_json = json.dumps(article.get("keywords", []))

        cursor = conn.execute("""
            INSERT OR IGNORE INTO articles
              (url, source, original_title, rewritten_body, summary,
               category, seo_title, meta_description, keywords, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            url,
            article.get("source", ""),
            article.get("title", ""),
            article.get("rewritten_body", ""),
            article.get("summary", ""),
            article.get("category", "local"),
            article.get("seo_title", ""),
            article.get("meta_description", ""),
            keywords_json,
            datetime.utcnow().isoformat(),
        ))
        conn.commit()
        db_id = cursor.lastrowid or -1
        conn.close()

        mark_processed(url)
        print(f"[Database] ✓ Article saved (id={db_id}) → {url[:60]}")
        return {**article, "db_id": db_id}

    except sqlite3.Error as exc:
        log_error("database", str(exc))
        print(f"[Database] ✗ SQLite error: {exc}")
        return {**article, "db_id": -1}


def fetch_articles(limit: int = 20, category: str | None = None) -> list[dict]:
    """Retrieve recent articles from the database (used by the admin API)."""
    try:
        conn = _get_connection()
        _ensure_table(conn)
        if category:
            rows = conn.execute(
                "SELECT * FROM articles WHERE category=? ORDER BY id DESC LIMIT ?",
                (category, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM articles ORDER BY id DESC LIMIT ?",
                (limit,)
            ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except sqlite3.Error as exc:
        log_error("database", str(exc))
        return []
