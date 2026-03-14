"""
tools/scrape_news.py
Tool: scrape_news()
Fetches article stubs from RSS feeds first, falls back to HTML scraping.
Returns: list of {title, url, source}
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

try:
    import feedparser
    _FEEDPARSER = True
except ImportError:
    _FEEDPARSER = False

from config.settings import RSS_FEEDS, SCRAPE_URLS
from memory.store import is_processed, log_error

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36"
}


def _from_rss(feed_url: str) -> list[dict]:
    if not _FEEDPARSER:
        return []
    try:
        feed = feedparser.parse(feed_url)
        results = []
        for entry in feed.entries:
            url = entry.get("link", "")
            title = entry.get("title", "")
            if url and title and not is_processed(url):
                results.append({"title": title, "url": url, "source": feed_url})
        return results
    except Exception as exc:
        log_error("scraper_agent", f"RSS parse failed {feed_url}: {exc}")
        return []


def _from_html(page_url: str) -> list[dict]:
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        results = []
        seen = set()
        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            title = tag.get_text(strip=True)
            if len(title) < 25:
                continue
            if href.startswith("/"):
                href = urljoin(page_url, href)
            if not href.startswith("http"):
                continue
            if href in seen or is_processed(href):
                continue
            seen.add(href)
            results.append({"title": title, "url": href, "source": page_url})
        return results
    except Exception as exc:
        log_error("scraper_agent", f"HTML scrape failed {page_url}: {exc}")
        return []


def scrape_news(rss_feeds=None, scrape_urls=None) -> list[dict]:
    """
    Returns list of new article stubs: [{title, url, source}]
    """
    rss_feeds   = rss_feeds   or RSS_FEEDS
    scrape_urls = scrape_urls or SCRAPE_URLS

    articles: list[dict] = []
    for feed in rss_feeds:
        articles.extend(_from_rss(feed))
    for url in scrape_urls:
        articles.extend(_from_html(url))

    # Deduplicate by URL
    seen, unique = set(), []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    print(f"[scrape_news] Found {len(unique)} new article(s).")
    return unique
