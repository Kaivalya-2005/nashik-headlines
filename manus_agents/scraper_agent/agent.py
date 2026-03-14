"""
scraper_agent/agent.py
ScraperAgent – collects article stubs from news sources.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.scrape_news import scrape_news
from memory.store import log_task, log_error


class ScraperAgent:
    name = "ScraperAgent"

    def run(self, context: dict | None = None) -> list[dict]:
        """
        Returns list of article stubs: [{title, url, source}]
        """
        log_task(self.name, "started")
        try:
            stubs = scrape_news()
            log_task(self.name, "completed", f"{len(stubs)} articles found")
            return stubs
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return []
