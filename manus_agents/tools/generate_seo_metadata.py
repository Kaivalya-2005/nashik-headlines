"""
tools/generate_seo_metadata.py
Tool: generate_seo_metadata(article: dict) -> dict
Generates SEO slug, meta title, meta description, and keyword tags via LLM.
Output is parsed from a JSON block the LLM produces.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json, re, requests
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.store import log_error

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


def _llm(prompt: str) -> str:
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as exc:
        log_error("seo_agent", f"SEO LLM call failed: {exc}")
        return ""


def _safe_slug(text: str) -> str:
    """Fallback slug from title."""
    s = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    return re.sub(r"\s+", "-", s.strip())[:60]


def _parse(raw: str, title: str) -> dict:
    try:
        clean = re.sub(r"```[a-z]*", "", raw).replace("```", "").strip()
        data = json.loads(clean)
        return {
            "slug":             data.get("slug") or _safe_slug(title),
            "meta_title":       data.get("meta_title", title)[:60],
            "meta_description": data.get("meta_description", "")[:155],
            "keywords":         data.get("keywords", []),
        }
    except (json.JSONDecodeError, TypeError):
        return {
            "slug": _safe_slug(title), "meta_title": title[:60],
            "meta_description": "", "keywords": [],
        }


def generate_seo_metadata(article: dict) -> dict:
    """
    Input:  article dict
    Output: same dict + slug, meta_title, meta_description, keywords
    """
    title = article.get("title", "")
    text  = article.get("rewritten_body") or article.get("body", "")
    raw   = _llm(_PROMPT.format(title=title, text=text[:3000]))
    seo   = _parse(raw, title)

    print(f"[generate_seo_metadata] ✓ slug={seo['slug'][:40]}")
    return {**article, **seo}
