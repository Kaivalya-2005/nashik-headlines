"""
extractor_agent/agent.py
ExtractorAgent – downloads article pages and extracts clean text.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.extract_article import extract_article
from memory.store import log_task, log_error


class ExtractorAgent:
    name = "ExtractorAgent"

    def run(self, stub: dict) -> dict:
        """
        Receives a stub {title, url, source}.
        Returns the stub enriched with 'body'.
        """
        log_task(self.name, "started", stub.get("url", ""))
        try:
            article = extract_article(stub)
            log_task(self.name, "completed", f"{len(article.get('body',''))} chars")
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return {**stub, "body": ""}
