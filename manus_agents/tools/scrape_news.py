"""
tools/scrape_news.py
Tool: scrape_news()
Fetches article stubs from RSS feeds first, falls back to HTML scraping.
Returns list of {title, url, source_id} mappings.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import mysql.connector

try:
    import feedparser
    _FEEDPARSER = True
except ImportError:
    _FEEDPARSER = False

from config.settings import RSS_FEEDS, SCRAPE_URLS, MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
from memory.store import is_processed, log_error

HEADERS = {"User-Agent": "Mozilla/5.0"}

def _get_sources() -> dict:
    """Fetch {url/rss: source_id} mapping from the DB."""
    sources_map = {}
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASSWORD,
            database=MYSQL_DB, port=MYSQL_PORT
        )
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, url, rss_url FROM sources")
        for row in cur.fetchall():
            if row["url"]:     sources_map[row["url"]] = row["id"]
            if row["rss_url"]: sources_map[row["rss_url"]] = row["id"]
        cur.close()
        conn.close()
    except Exception as e:
        log_error("scraper_agent", f"Failed to fetch sources: {e}")
    return sources_map


def _from_rss(feed_url: str, source_id: int) -> list[dict]:
    if not _FEEDPARSER: return []
    try:
        feed = feedparser.parse(feed_url)
        results = []
        for entry in feed.entries:
            url = entry.get("link", "")
            title = entry.get("title", "")
            if url and title and not is_processed(url):
                results.append({"title": title, "url": url, "source_id": source_id})
        return results
    except Exception as exc:
        log_error("scraper_agent", f"RSS parse failed {feed_url}: {exc}")
        return []

def _from_html(page_url: str, source_id: int) -> list[dict]:
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        results, seen = [], set()
        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            title = tag.get_text(strip=True)
            if len(title) < 25: continue
            if href.startswith("/"): href = urljoin(page_url, href)
            if not href.startswith("http"): continue
            if href in seen or is_processed(href): continue
            seen.add(href)
            results.append({"title": title, "url": href, "source_id": source_id})
        return results
    except Exception as exc:
        log_error("scraper_agent", f"HTML scrape failed {page_url}: {exc}")
        return []

def scrape_news() -> list[dict]:
    """Returns [{title, url, source_id}]"""
    sources_map = _get_sources()
    articles: list[dict] = []

    for feed in RSS_FEEDS:
        s_id = sources_map.get(feed, None)
        articles.extend(_from_rss(feed, s_id))
    for url in SCRAPE_URLS:
        s_id = sources_map.get(url, None)
        articles.extend(_from_html(url, s_id))

    # Deduplicate URL
    seen, unique = set(), []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    print(f"[scrape_news] Found {len(unique)} new article(s).")
    return unique
