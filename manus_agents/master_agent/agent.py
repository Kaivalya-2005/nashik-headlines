"""
master_agent/agent.py
MasterAgent – orchestrares workflow, grabs raw_articles, passes source_id.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mysql.connector
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT

from scraper_agent.agent    import ScraperAgent
from extractor_agent.agent  import ExtractorAgent
from editor_agent.agent     import EditorAgent
from seo_agent.agent        import SEOAgent
# from image_agent.agent      import ImageAgent  # IMAGE GENERATION DISABLED
from publisher_agent.agent  import PublisherAgent
from memory.store import log_task, log_error


class MasterAgent:
    name = "MasterAgent"

    def __init__(self):
        self.scraper   = ScraperAgent()
        self.extractor = ExtractorAgent()
        self.editor    = EditorAgent()
        self.seo       = SEOAgent()
        # self.image     = ImageAgent()  # IMAGE GENERATION DISABLED
        self.publisher = PublisherAgent()

    def _get_conn(self):
        return mysql.connector.connect(
            host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
            database=MYSQL_DB, port=MYSQL_PORT
        )

    def _banner(self, msg: str):
        print(f"\n{'═'*64}\n  {msg}\n{'═'*64}")

    def _step(self, step: int, name: str, url: str = ""):
        short = url[:55] + "…" if len(url) > 55 else url
        print(f"\n  ┌─ Step {step}: {name}")
        if short: print(f"  │  {short}")

    def _update_raw_status(self, raw_id: int, status: str):
        try:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("UPDATE raw_articles SET status=%s WHERE id=%s", (status, raw_id))
            conn.commit()
            cur.close()
            conn.close()
        except: pass

    def process(self, stub: dict) -> dict:
        url = stub.get("url", "unknown")
        raw_id = stub.get("id")
        
        self._banner(f"Processing: {url[:55]}")
        log_task(self.name, f"pipeline_start: raw_id={raw_id}", raw_id)

        try:
            self._step(1, "ExtractorAgent", url)
            article = self.extractor.run(stub)
            if not article.get("body"):
                print("  │  ⚠ No body extracted — skipping.")
                if raw_id: self._update_raw_status(raw_id, "rejected")
                return article

            self._step(2, "EditorAgent")
            article = self.editor.run(article)

            self._step(3, "SEOAgent")
            article = self.seo.run(article)

            # self._step(4, "ImageAgent")
            # article = self.image.run(article)  # IMAGE GENERATION DISABLED

            self._step(4, "PublisherAgent")
            article = self.publisher.run(article)

            if raw_id:
                if article.get("db_id", -1) > 0:
                    self._update_raw_status(raw_id, "processed")
                else:
                    self._update_raw_status(raw_id, "rejected")

            log_task(self.name, "pipeline_complete", article.get("db_id"))
            print(f"\n  ✅ Saved id={article.get('db_id')} drafted")
            return article
            
        except Exception as exc:
            log_error(self.name, f"Process failure {url}: {exc}")
            if raw_id: self._update_raw_status(raw_id, "rejected")
            return stub

    def run(self) -> int:
        self._banner("MasterAgent — Starting Scrape Cycle")

        self.scraper.run()

        pending = []
        try:
            conn = self._get_conn()
            cur = conn.cursor(dictionary=True)
            # Retrieve source_id instead of source string
            cur.execute("SELECT id, title, url, source_id FROM raw_articles WHERE status='pending' LIMIT 10")
            pending = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as exc:
            log_error(self.name, f"Fetch pending fail: {exc}")

        if not pending:
            return 0

        saved = 0
        for i, stub in enumerate(pending, 1):
            result = self.process(stub)
            if result.get("db_id", -1) > 0:
                saved += 1
        return saved

    def dry_run(self) -> dict:
        from tools.init_db import init_db
        init_db()
        return {"status": "dry_run_passed"}
