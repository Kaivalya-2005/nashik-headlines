"""
tools/generate_seo_metadata.py
Tool: generate_seo_metadata(article: dict) -> dict
Generates SEO slug, meta title, meta description, and keyword tags via LLM.
Includes retry logic and intelligent fallback strategies.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json, re, requests, logging
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, MAX_RETRIES
from memory.store import log_error
from tools.retry_helper import retry_with_fallback

log = logging.getLogger("manus-agents")

_PROMPT = """You are an SEO expert for "Nashik Headlines".

For the article below produce exactly this JSON (no extra text):
{{
  "slug": "url-friendly-slug-max-60-chars",
  "meta_title": "SEO title max 60 chars",
  "meta_description": "Compelling snippet max 155 chars",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}}

ARTICLE TITLE: {title}

ARTICLE:
{text}

JSON:"""


@retry_with_fallback(max_attempts=MAX_RETRIES, delay=1.0, backoff=2.0, fallback_value="")
def _llm(prompt: str) -> str:
    """Call local LLM with retry logic."""
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=OLLAMA_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


def _safe_slug(text: str) -> str:
    """Fallback slug from title - always safe to use."""
    s = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    return re.sub(r"\s+", "-", s.strip())[:60]


def _extract_keywords(text: str) -> list:
    """Fallback keyword extraction using simple word frequency."""
    # Remove stopwords
    stopwords = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
                 "is", "are", "was", "be", "have", "that", "this", "it", "of"}
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    word_freq = {}
    for w in words:
        if w not in stopwords:
            word_freq[w] = word_freq.get(w, 0) + 1
    
    keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    return [kw[0] for kw in keywords]


def _parse(raw: str, title: str, context_text: str) -> dict:
    """Parse LLM response with intelligent fallbacks."""
    try:
        # Extract JSON block
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
        data = json.loads(raw)
        
        # Validate and clean fields
        slug = (data.get("slug") or "").strip()
        if not slug or not re.match(r'^[a-z0-9-]+$', slug):
            slug = _safe_slug(title)
        
        meta_title = (data.get("meta_title") or title)[:60]
        meta_desc = (data.get("meta_description") or "")[:155]
        keywords = data.get("keywords", [])
        
        if not isinstance(keywords, list):
            keywords = []
        keywords = [str(k).strip() for k in keywords if k][:5]
        
        log.info(f"[generate_seo_metadata] Parsed LLM response: slug={slug}")
        return {
            "slug": slug,
            "meta_title": meta_title,
            "meta_description": meta_desc,
            "keywords": keywords,
        }
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        log.warning(f"Failed to parse SEO JSON: {exc} → using fallback")
        # Generate from context
        keywords = _extract_keywords(context_text)
        return {
            "slug": _safe_slug(title),
            "meta_title": title[:60],
            "meta_description": context_text[:155],
            "keywords": keywords,
        }


def generate_seo_metadata(article: dict) -> dict:
    """
    Input:  article dict
    Output: same dict + slug, meta_title, meta_description, keywords
    
    Fallback strategy:
    1. Try AI-generated SEO metadata
    2. Falls back to rule-based slug generation and keyword extraction
    """
    title = article.get("title", "Unknown")
    text  = article.get("rewritten_body") or article.get("body", "")
    
    if not text:
        log.warning("[generate_seo_metadata] No text available, using title-based fallback")
        return {
            **article,
            "slug": _safe_slug(title),
            "meta_title": title[:60],
            "meta_description": "",
            "keywords": [],
        }
    
    try:
        raw = _llm(_PROMPT.format(title=title, text=text[:3000]))
        if not raw:
            log.warning("[generate_seo_metadata] LLM returned empty → using fallback")
            seo = _parse("", title, text)
        else:
            seo = _parse(raw, title, text)
    except Exception as exc:
        log_error("generate_seo_metadata", str(exc))
        log.warning("[generate_seo_metadata] LLM failed → using fallback")
        seo = _parse("", title, text)
    
    print(f"[generate_seo_metadata] ✓ slug={seo['slug'][:40]}")
    return {**article, **seo}
