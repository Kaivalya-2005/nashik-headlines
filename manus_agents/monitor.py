#!/usr/bin/env python3
"""
monitor.py
----------
System health check and monitoring dashboard for manus_agents.
Use to diagnose issues and monitor pipeline performance.

Usage:
  python monitor.py              → Full health check
  python monitor.py --logs       → Show recent agent logs
  python monitor.py --stats      → Show pipeline statistics
  python monitor.py --errors     → Show recent errors only
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import argparse
import logging
from datetime import datetime, timedelta
import mysql.connector
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("monitor")

_banner = lambda msg: print(f"\n┌─ {msg}\n│")
_section = lambda: print("└─" + "─" * 62)


def get_conn():
    """Connect to MySQL database."""
    return mysql.connector.connect(
        host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
        database=MYSQL_DB, port=MYSQL_PORT
    )


def check_database():
    """Test database connection."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return True, "✓ MySQL connected"
    except Exception as exc:
        return False, f"✗ MySQL failed: {exc}"


def check_ollama():
    """Test Ollama LLM connection."""
    try:
        import requests
        from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if resp.ok:
            models = [m["name"] for m in resp.json().get("models", [])]
            model_status = "✓" if OLLAMA_MODEL in models else "⚠"
            return True, f"{model_status} Ollama OK ({OLLAMA_MODEL})"
        else:
            return False, f"✗ Ollama unreachable: {resp.status_code}"
    except Exception as exc:
        return False, f"✗ Ollama error: {exc}"


def check_uploads_dir():
    """Check uploads directory."""
    from config.settings import UPLOADS_DIR
    try:
        if os.path.exists(UPLOADS_DIR):
            count = sum(1 for _, _, files in os.walk(UPLOADS_DIR) for _ in files)
            return True, f"✓ Uploads dir OK ({count} files)"
        else:
            os.makedirs(UPLOADS_DIR, exist_ok=True)
            return True, f"✓ Uploads dir created"
    except Exception as exc:
        return False, f"✗ Uploads error: {exc}"


def get_statistics():
    """Get pipeline statistics."""
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        
        stats = {}
        
        # Raw articles
        cur.execute("SELECT status, COUNT(*) as count FROM raw_articles GROUP BY status")
        raw_status = {row["status"]: row["count"] for row in cur.fetchall()}
        stats["raw_total"] = sum(raw_status.values())
        stats["raw_pending"] = raw_status.get("pending", 0)
        stats["raw_processed"] = raw_status.get("processed", 0)
        stats["raw_rejected"] = raw_status.get("rejected", 0)
        
        # Processed articles
        cur.execute("SELECT COUNT(*) as count FROM processed_articles")
        stats["articles_published"] = cur.fetchone()["count"]
        
        # Agent logs
        cur.execute("SELECT COUNT(*) as count FROM agent_logs")
        stats["total_logs"] = cur.fetchone()["count"]
        
        cur.execute("SELECT COUNT(*) as count FROM agent_logs WHERE message LIKE 'ERROR:%'")
        stats["error_logs"] = cur.fetchone()["count"]
        
        # Sources
        cur.execute("SELECT COUNT(*) as count FROM sources")
        stats["sources"] = cur.fetchone()["count"]
        
        cur.close()
        conn.close()
        return stats
    except Exception as exc:
        log.error(f"Failed to get stats: {exc}")
        return {}


def show_stats():
    """Display pipeline statistics."""
    _banner("Pipeline Statistics")
    stats = get_statistics()
    
    if not stats:
        print("│ Unable to fetch statistics")
        _section()
        return
    
    print(f"│ Raw Articles:")
    print(f"│   Total: {stats.get('raw_total', 0):5d}")
    print(f"│   Pending: {stats.get('raw_pending', 0):3d}  ━  Processed: {stats.get('raw_processed', 0):5d}  ━  Rejected: {stats.get('raw_rejected', 0):3d}")
    
    print(f"│")
    print(f"│ Processed Articles:")
    print(f"│   Published: {stats.get('articles_published', 0):5d}")
    
    print(f"│")
    print(f"│ Logging:")
    print(f"│   Total Logs: {stats.get('total_logs', 0):5d}")
    print(f"│   Error Logs: {stats.get('error_logs', 0):5d}")
    
    print(f"│")
    print(f"│ Sources: {stats.get('sources', 0)}")
    
    _section()


def show_recent_logs(limit=20, errors_only=False):
    """Show recent agent logs."""
    title = "Recent Errors" if errors_only else f"Recent Logs (last {limit})"
    _banner(title)
    
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        
        where = "WHERE message LIKE 'ERROR:%'" if errors_only else ""
        cur.execute(
            f"SELECT agent_name, message, created_at FROM agent_logs {where} "
            f"ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        if not rows:
            print(f"│ No logs found")
        else:
            for row in rows:
                agent = row["agent_name"][:15].ljust(15)
                msg = row["message"][:45]
                time_str = row["created_at"].strftime("%Y-%m-%d %H:%M:%S") if row["created_at"] else "?"
                print(f"│ [{time_str}] {agent} | {msg}")
        
        _section()
    except Exception as exc:
        print(f"│ Error fetching logs: {exc}")
        _section()


def health_check():
    """Run full system health check."""
    _banner("System Health Check")
    
    checks = [
        ("Database", check_database),
        ("Ollama LLM", check_ollama),
        ("Uploads Directory", check_uploads_dir),
    ]
    
    results = []
    for name, check_fn in checks:
        status, msg = check_fn()
        results.append((name, status, msg))
        print(f"│ {msg}")
    
    _section()
    
    # Summary
    passed = sum(1 for _, status, _ in results if status)
    total = len(results)
    print(f"\n  Summary: {passed}/{total} checks passed")
    
    if passed == total:
        print("  ✅ All systems operational!")
    else:
        print("  ⚠️  Some systems need attention")
    
    return passed == total


def main():
    parser = argparse.ArgumentParser(
        description="manus_agents system monitor"
    )
    parser.add_argument("--logs", action="store_true", help="Show recent logs")
    parser.add_argument("--stats", action="store_true", help="Show statistics")
    parser.add_argument("--errors", action="store_true", help="Show recent errors")
    args = parser.parse_args()
    
    if args.errors:
        show_recent_logs(limit=30, errors_only=True)
    elif args.logs:
        show_recent_logs(limit=30)
    elif args.stats:
        show_stats()
    else:
        health_check()
        show_stats()


if __name__ == "__main__":
    main()
