"""
scraper_agent/agent.py
ScraperAgent – pulls from scraped sources and inserts into raw_articles.
Now handles source_id foreign key.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mysql.connector
from tools.scrape_news import scrape_news
from config.settings import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
from memory.store import log_task, log_error

class ScraperAgent:
    name = "ScraperAgent"

    def run(self) -> int:
        log_task(self.name, "started scraper cycle")
        new_stubs = scrape_news()
        
        if not new_stubs:
            log_task(self.name, "completed", 0)
            return 0

        inserted = 0
        try:
            conn = mysql.connector.connect(
                host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
                database=MYSQL_DB, port=MYSQL_PORT
            )
            cur = conn.cursor()
            
            for stub in new_stubs:
                try:
                    cur.execute("""
                        INSERT INTO raw_articles (title, url, source_id, status) 
                        VALUES (%s, %s, %s, 'pending')
                    """, (stub["title"], stub["url"], stub["source_id"]))
                    inserted += 1
                except mysql.connector.IntegrityError:
                    pass
                except Exception as e:
                    log_error(self.name, f"Insert raw fail: {e}")
            
            conn.commit()
            cur.close()
            conn.close()
        except Exception as exc:
            log_error(self.name, f"DB Error: {exc}")
            
        log_task(self.name, "completed", inserted)
        return inserted
