"""
master_agent/agent.py
MasterAgent – the orchestrator that coordinates the entire pipeline.

Pipeline:
  ScraperAgent → ExtractorAgent → EditorAgent → SEOAgent → ImageAgent → PublisherAgent
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scraper_agent.agent    import ScraperAgent
from extractor_agent.agent  import ExtractorAgent
from editor_agent.agent     import EditorAgent
from seo_agent.agent        import SEOAgent
from image_agent.agent      import ImageAgent
from publisher_agent.agent  import PublisherAgent
from memory.store import log_task, log_error, get_snapshot


class MasterAgent:
    """
    Controls the entire news-processing workflow.

    Usage:
        master = MasterAgent()
        master.run()             # full pipeline (scrape → publish)
        master.process(stub)     # process one article stub directly
    """

    name = "MasterAgent"

    def __init__(self):
        self.scraper   = ScraperAgent()
        self.extractor = ExtractorAgent()
        self.editor    = EditorAgent()
        self.seo       = SEOAgent()
        self.image     = ImageAgent()
        self.publisher = PublisherAgent()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _banner(self, msg: str):
        width = 64
        print(f"\n{'═'*width}")
        print(f"  {msg}")
        print(f"{'═'*width}")

    def _step(self, step: int, name: str, url: str = ""):
        short = url[:55] + "…" if len(url) > 55 else url
        print(f"\n  ┌─ Step {step}: {name}")
        if short:
            print(f"  │  {short}")

    # ── Pipeline ──────────────────────────────────────────────────────────────

    def process(self, stub: dict) -> dict:
        """
        Run the full processing pipeline on a single article stub.

        Parameters
        ----------
        stub : {title, url, source}

        Returns
        -------
        Fully enriched article dict.
        """
        url = stub.get("url", "unknown")
        self._banner(f"Processing: {url[:55]}")
        log_task(self.name, "pipeline_start", url)

        # Step 1 – Extract
        self._step(1, "ExtractorAgent", url)
        article = self.extractor.run(stub)
        if not article.get("body"):
            print("  │  ⚠ No body extracted — skipping article.")
            log_task(self.name, "skipped_no_body", url)
            return article

        # Step 2 – Edit (rewrite + summary + classify + headline)
        self._step(2, "EditorAgent")
        article = self.editor.run(article)

        # Step 3 – SEO
        self._step(3, "SEOAgent")
        article = self.seo.run(article)

        # Step 4 – Image
        self._step(4, "ImageAgent")
        article = self.image.run(article)

        # Step 5 – Publish
        self._step(5, "PublisherAgent")
        article = self.publisher.run(article)

        log_task(self.name, "pipeline_complete", f"db_id={article.get('db_id')}")
        print(f"\n  ✅ Article saved  id={article.get('db_id')}  status=draft")
        return article

    def run(self) -> int:
        """
        Full cycle: scrape all sources, then process each new article.

        Returns
        -------
        Number of articles successfully saved.
        """
        self._banner("MasterAgent — Starting Scrape Cycle")
        log_task(self.name, "cycle_start")

        # Step 0 – Scrape
        stubs = self.scraper.run()
        if not stubs:
            print("[MasterAgent] No new articles found.")
            log_task(self.name, "cycle_complete", "0 articles")
            return 0

        saved = 0
        for i, stub in enumerate(stubs, 1):
            print(f"\n[MasterAgent] Article {i}/{len(stubs)}")
            try:
                result = self.process(stub)
                if result.get("db_id", -1) > 0:
                    saved += 1
            except Exception as exc:
                log_error(self.name, f"Unhandled error on {stub.get('url')}: {exc}")
                print(f"[MasterAgent] ✗ Error: {exc}")

        self._banner(f"Cycle Complete — {saved}/{len(stubs)} articles saved")
        log_task(self.name, "cycle_complete", f"{saved} saved")
        return saved

    def dry_run(self) -> dict:
        """
        Smoke-test: verify all agents can be instantiated and the DB initialised.
        No network calls, no LLM calls.
        """
        from tools.store_article import init_db
        init_db()
        snapshot = get_snapshot()
        return {
            "agents": [
                self.scraper.name, self.extractor.name, self.editor.name,
                self.seo.name, self.image.name, self.publisher.name,
            ],
            "memory_urls": len(snapshot["processed_urls"]),
            "db": "OK",
            "status": "dry_run_passed",
        }
