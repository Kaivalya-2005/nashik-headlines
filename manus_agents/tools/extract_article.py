"""
tools/extract_article.py
Tool: extract_article()
Extracts clean article body from a URL using newspaper3k.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from newspaper import Article
from memory.store import log_error


def _newspaper_extract(url: str) -> str | None:
    try:
        article = Article(url)
        article.download()
        article.parse()
        text = article.text.strip()
        if len(text) > 150:
            return text
        return None
    except Exception as exc:
        log_error("extractor_agent", f"extraction failed {url}: {exc}")
        return None


def extract_article(stub: dict) -> dict:
    """
    Input:  {title, url, source}
    Output: same dict + 'body' key (str, may be empty on failure)
    """
    url = stub.get("url", "")
    body = _newspaper_extract(url) if url else None

    # Update stub with the extracted body content
    stub = {**stub, "body": body or ""}
    status = f"{len(body)} chars" if body else "FAILED"
    print(f"[extract_article] {status} ← {url[:70]}")
    return stub
