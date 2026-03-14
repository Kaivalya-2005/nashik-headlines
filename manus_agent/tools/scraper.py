"""
scraper.py
----------
Scrapes headlines and article links from configured news sources.
Returns a list of article dicts: {title, url, source}.
"""

import requests
from bs4 import BeautifulSoup
from config.model_config import NEWS_SOURCES, OLLAMA_TIMEOUT
from memory.memory_manager import is_processed, log_error


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0 Safari/537.36"
    )
}


def _scrape_source(source_url: str) -> list[dict]:
    """Scrape one source URL and return raw article stubs."""
    try:
        resp = requests.get(source_url, headers=HEADERS, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:
        log_error("scraper", f"Failed to fetch {source_url}: {exc}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    articles = []

    # Generic heuristic: collect <a> tags that look like article links
    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        title = tag.get_text(strip=True)

        # Filter out empty / navigation links
        if len(title) < 20:
            continue
        if href.startswith("/"):
            # Make absolute
            from urllib.parse import urljoin
            href = urljoin(source_url, href)
        if not href.startswith("http"):
            continue

        if is_processed(href):
            continue  # skip already-seen articles

        articles.append({"title": title, "url": href, "source": source_url})

    # Deduplicate by URL within this source
    seen = set()
    unique = []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    return unique


def scrape_news(sources: list[str] | None = None) -> list[dict]:
    """
    Scrape all configured news sources.

    Parameters
    ----------
    sources : list of URLs (defaults to NEWS_SOURCES from config)

    Returns
    -------
    list of dicts  {title, url, source}
    """
    sources = sources or NEWS_SOURCES
    all_articles: list[dict] = []
    for src in sources:
        all_articles.extend(_scrape_source(src))

    print(f"[Scraper] Found {len(all_articles)} new article(s) across {len(sources)} source(s).")
    return all_articles
