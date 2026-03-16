"""
publisher_agent/agent.py
PublisherAgent – stores the fully processed article in MySQL with status='draft'.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.store_article import store_article
from memory.store import log_task, log_error


class PublisherAgent:
    name = "PublisherAgent"

    def run(self, article: dict) -> dict:
        log_task(self.name, f"started: {article.get('url', '')}")
        try:
            article = store_article(article)
            log_task(self.name, f"completed: db_id={article.get('db_id')}")
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return {**article, "db_id": -1}
