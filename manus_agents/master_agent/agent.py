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
        self.web_scraper_enabled = True

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

    def set_web_scraper_enabled(self, enabled: bool):
        self.web_scraper_enabled = bool(enabled)

    def get_runtime_config(self) -> dict:
        return {
            "web_scraper_enabled": self.web_scraper_enabled,
            "image_generation_enabled": False,
        }

    def run_scraper(self) -> int:
        return self.scraper.run()

    def _fetch_pending(self, limit: int = 10) -> list:
        pending = []
        try:
            conn = self._get_conn()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT id, title, url, source_id FROM raw_articles WHERE status='pending' LIMIT %s",
                (limit,)
            )
            pending = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as exc:
            log_error(self.name, f"Fetch pending fail: {exc}")
        return pending

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

    def run(self, include_scraper: bool | None = None, limit: int = 10) -> int:
        self._banner("MasterAgent — Starting Scrape Cycle")

        should_scrape = self.web_scraper_enabled if include_scraper is None else bool(include_scraper)
        if should_scrape:
            self.scraper.run()

        pending = self._fetch_pending(limit=limit)

        if not pending:
            return 0

        saved = 0
        for i, stub in enumerate(pending, 1):
            result = self.process(stub)
            if result.get("db_id", -1) > 0:
                saved += 1
        return saved

    def process_pending(self, limit: int = 10) -> dict:
        pending = self._fetch_pending(limit=limit)
        if not pending:
            return {"requested": limit, "processed": 0, "saved": 0}

        saved = 0
        processed = 0
        for stub in pending:
            processed += 1
            result = self.process(stub)
            if result.get("db_id", -1) > 0:
                saved += 1

        return {"requested": limit, "processed": processed, "saved": saved}

    def get_stats(self) -> dict:
        stats = {
            "raw_total": 0,
            "raw_pending": 0,
            "raw_processed": 0,
            "raw_rejected": 0,
            "articles_total": 0,
            "articles_draft": 0,
            "articles_published": 0,
            "articles_rejected": 0,
            "sources": 0,
        }
        try:
            conn = self._get_conn()
            cur = conn.cursor(dictionary=True)

            cur.execute("SELECT status, COUNT(*) as count FROM raw_articles GROUP BY status")
            for row in cur.fetchall():
                status = row["status"]
                count = row["count"]
                stats["raw_total"] += count
                if status == "pending":
                    stats["raw_pending"] = count
                elif status == "processed":
                    stats["raw_processed"] = count
                elif status == "rejected":
                    stats["raw_rejected"] = count

            cur.execute("SELECT status, COUNT(*) as count FROM processed_articles GROUP BY status")
            for row in cur.fetchall():
                status = row["status"]
                count = row["count"]
                stats["articles_total"] += count
                if status == "draft":
                    stats["articles_draft"] = count
                elif status == "published":
                    stats["articles_published"] = count
                elif status == "rejected":
                    stats["articles_rejected"] = count

            cur.execute("SELECT COUNT(*) as count FROM sources")
            stats["sources"] = cur.fetchone()["count"]

            cur.close()
            conn.close()
        except Exception as exc:
            log_error(self.name, f"Stats fetch fail: {exc}")

        return stats

    def get_queue(self, limit: int = 20) -> dict:
        queue = {"pending_count": 0, "pending_items": []}
        try:
            conn = self._get_conn()
            cur = conn.cursor(dictionary=True)

            cur.execute("SELECT COUNT(*) as count FROM raw_articles WHERE status='pending'")
            queue["pending_count"] = cur.fetchone()["count"]

            cur.execute(
                "SELECT id, title, url, source_id FROM raw_articles WHERE status='pending' ORDER BY id DESC LIMIT %s",
                (limit,)
            )
            queue["pending_items"] = cur.fetchall()

            cur.close()
            conn.close()
        except Exception as exc:
            log_error(self.name, f"Queue fetch fail: {exc}")

        return queue

    def dry_run(self) -> dict:
        from tools.init_db import init_db
        init_db()
        return {"status": "dry_run_passed"}
