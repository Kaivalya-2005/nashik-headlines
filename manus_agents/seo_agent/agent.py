"""
seo_agent/agent.py
SEOAgent – generates slug, meta title, meta description, and keywords.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.generate_seo_metadata import generate_seo_metadata
from memory.store import log_task, log_error


class SEOAgent:
    name = "SEOAgent"

    def run(self, article: dict) -> dict:
        log_task(self.name, "started", article.get("url", ""))
        try:
            article = generate_seo_metadata(article)
            log_task(self.name, "completed", article.get("slug", ""))
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return article
