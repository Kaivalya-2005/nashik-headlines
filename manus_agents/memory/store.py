"""
memory/store.py
Tracks system state and logs agent actions.
Now relies on the MySQL 'agent_logs' and 'raw_articles' tables directly.
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mysql.connector
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT

def _get_conn():
    return mysql.connector.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        port=MYSQL_PORT,
    )

def is_processed(url: str) -> bool:
    """Check if the URL exists in the database already (either raw or processed)."""
    try:
        conn = _get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM raw_articles WHERE url = %s", (url,)
        )
        exists = cur.fetchone() is not None
        cur.close()
        conn.close()
        return exists
    except Exception:
        return False

def log_task(agent_name: str, message: str, article_id: int = None):
    """Log an event to the agent_logs table."""
    try:
        conn = _get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO agent_logs (agent_name, message, article_id) VALUES (%s, %s, %s)",
            (agent_name, message, article_id)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f"Log Error: {exc}")

def log_error(agent_name: str, error_msg: str, article_id: int = None):
    """Log an error to the agent_logs table."""
    log_task(agent_name, f"ERROR: {error_msg}", article_id)

def get_snapshot() -> dict:
    """Return memory statistics."""
    try:
        conn = _get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) AS total FROM raw_articles")
        raw_count = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM processed_articles")
        proc_count = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM agent_logs")
        logs_count = cur.fetchone()["total"]
        cur.close()
        conn.close()
        return {
            "raw_articles_count": raw_count,
            "processed_articles_count": proc_count,
            "total_logs": logs_count
        }
    except Exception:
        return {}
