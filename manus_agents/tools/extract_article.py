"""
tools/extract_article.py
Tool: extract_article()
Extracts clean article body from a URL.
Uses newspaper3k when available, falls back to BeautifulSoup.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from bs4 import BeautifulSoup
from memory.store import log_error

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36"
}

try:
    from newspaper import Article as _NpArticle
    _NEWSPAPER = True
except ImportError:
    _NEWSPAPER = False


def _newspaper_extract(url: str) -> str | None:
    try:
        art = _NpArticle(url)
        art.download()
        art.parse()
        return art.text.strip() if len(art.text.strip()) > 80 else None
    except Exception as exc:
        log_error("extractor_agent", f"newspaper3k failed {url}: {exc}")
        return None


def _bs4_extract(url: str) -> str | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=25)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        for sel in ["article", "[class*='article']", "[class*='story']", "main"]:
            node = soup.select_one(sel)
            if node:
                text = node.get_text(separator="\n", strip=True)
                if len(text) > 80:
                    return text
        return soup.body.get_text(separator="\n", strip=True) if soup.body else None
    except Exception as exc:
        log_error("extractor_agent", f"bs4 fallback failed {url}: {exc}")
        return None


def extract_article(stub: dict) -> dict:
    """
    Input:  {title, url, source}
    Output: same dict + 'body' key (str, may be empty on failure)
    """
    url = stub["url"]
    body = _newspaper_extract(url) if _NEWSPAPER else None
    if not body:
        body = _bs4_extract(url)

    stub = {**stub, "body": body or ""}
    status = f"{len(body)} chars" if body else "FAILED"
    print(f"[extract_article] {status} ← {url[:70]}")
    return stub
