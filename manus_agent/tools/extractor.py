"""
extractor.py
------------
Extracts clean article body text from a URL using newspaper3k.
Falls back to BeautifulSoup if newspaper3k fails.
"""

import requests
from bs4 import BeautifulSoup
from memory.memory_manager import log_error

try:
    from newspaper import Article as NewspaperArticle
    _NEWSPAPER_AVAILABLE = True
except ImportError:
    _NEWSPAPER_AVAILABLE = False


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0 Safari/537.36"
    )
}


def _extract_with_newspaper(url: str) -> str | None:
    try:
        article = NewspaperArticle(url)
        article.download()
        article.parse()
        text = article.text.strip()
        return text if len(text) > 100 else None
    except Exception as exc:
        log_error("extractor", f"newspaper3k failed for {url}: {exc}")
        return None


def _extract_with_bs4(url: str) -> str | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Remove nav, footer, script, style noise
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Try common article containers
        for selector in ["article", "[class*='article']", "[class*='content']", "main"]:
            container = soup.select_one(selector)
            if container:
                text = container.get_text(separator="\n", strip=True)
                if len(text) > 100:
                    return text

        return soup.body.get_text(separator="\n", strip=True) if soup.body else None
    except Exception as exc:
        log_error("extractor", f"bs4 fallback failed for {url}: {exc}")
        return None


def extract_article(article_stub: dict) -> dict:
    """
    Given a stub dict {title, url, source}, fetch and return full article content.

    Returns
    -------
    dict  {title, url, source, body}  — body is empty string on failure.
    """
    url = article_stub["url"]
    body = None

    if _NEWSPAPER_AVAILABLE:
        body = _extract_with_newspaper(url)

    if not body:
        body = _extract_with_bs4(url)

    result = {**article_stub, "body": body or ""}
    if not body:
        print(f"[Extractor] ⚠ Could not extract body for: {url}")
    else:
        print(f"[Extractor] ✓ Extracted {len(body)} chars from: {url}")

    return result
