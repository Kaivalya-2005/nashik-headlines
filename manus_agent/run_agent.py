"""
run_agent.py
------------
Entry point for the Mini-Manus autonomous agent.

Usage:
  python run_agent.py              → continuous automation loop (every 30 min)
  python run_agent.py --once       → run one scrape-process cycle and exit
  python run_agent.py --api        → start the FastAPI admin server only
  python run_agent.py --api --loop → start API + run automation loop concurrently
"""

import sys
import os
import time
import threading
import argparse

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(__file__))

from tools.scraper      import scrape_news
from agent.controller   import process_article
from memory.memory_manager import log_task
from config.model_config   import AGENT_LOOP_INTERVAL_SECONDS

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("mini-manus")


# ── Core loop ──────────────────────────────────────────────────────────────────

def run_pipeline_cycle():
    """Scrape all sources, process each new article once."""
    log.info("🔄 Starting scrape + process cycle …")
    log_task("pipeline_cycle", "started")

    articles = scrape_news()
    log.info(f"📰 {len(articles)} new article(s) to process.")

    for stub in articles:
        try:
            process_article(stub)
        except Exception as exc:
            log.error(f"Pipeline error on {stub.get('url')}: {exc}")

    log_task("pipeline_cycle", "completed", f"{len(articles)} articles")
    log.info("✅ Cycle complete.\n")


def automation_loop():
    """Continuous loop: scrape → process → sleep → repeat."""
    log.info(f"🤖 Mini-Manus agent started. Interval: {AGENT_LOOP_INTERVAL_SECONDS}s")
    while True:
        run_pipeline_cycle()
        log.info(f"💤 Sleeping {AGENT_LOOP_INTERVAL_SECONDS}s …")
        time.sleep(AGENT_LOOP_INTERVAL_SECONDS)


# ── API server ─────────────────────────────────────────────────────────────────

def start_api():
    """Start the FastAPI admin server."""
    import uvicorn
    log.info("🌐 Starting admin API on http://0.0.0.0:8001")
    uvicorn.run("api.server:app", host="0.0.0.0", port=8001, reload=False)


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Mini-Manus Agent for Nashik Headlines")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    parser.add_argument("--api",  action="store_true", help="Start the admin API server")
    parser.add_argument("--loop", action="store_true", help="Run the automation loop (use with --api for both)")
    args = parser.parse_args()

    if args.once:
        run_pipeline_cycle()
        return

    if args.api and args.loop:
        # Run loop in background thread, API in foreground
        t = threading.Thread(target=automation_loop, daemon=True)
        t.start()
        start_api()
        return

    if args.api:
        start_api()
        return

    # Default: automation loop
    automation_loop()


if __name__ == "__main__":
    main()
