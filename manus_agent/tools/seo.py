"""
seo.py
------
Generates an SEO-optimised title, meta description, and keyword list
for a processed article using the local LLM.
"""

import requests
import json
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.memory_manager import log_error


SEO_PROMPT_TEMPLATE = """You are an SEO expert for "Nashik Headlines".

Given the article below, generate:
1. SEO Title (max 60 chars, compelling, includes main keyword)
2. Meta Description (max 160 chars, summarises article for search engine snippet)
3. Keywords (5-8 comma-separated keywords)

Output ONLY valid JSON in this exact format:
{{
  "seo_title": "...",
  "meta_description": "...",
  "keywords": ["kw1", "kw2", "kw3"]
}}

ARTICLE:
{text}

JSON:"""


def _call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.RequestException as exc:
        log_error("seo", f"Ollama request failed: {exc}")
        return ""


def _parse_seo_json(raw: str) -> dict:
    """Attempt to parse JSON from LLM output. Falls back to empty dict."""
    try:
        # Strip any markdown code fences the model may have added
        clean = raw.strip().strip("```json").strip("```").strip()
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return {}


def generate_seo(article: dict) -> dict:
    """
    Generate SEO metadata for the article.

    Returns
    -------
    Same dict with 'seo_title', 'meta_description', 'keywords' keys added.
    """
    text = article.get("rewritten_body") or article.get("body", "")
    prompt = SEO_PROMPT_TEMPLATE.format(text=text[:3000])
    raw = _call_ollama(prompt)
    seo = _parse_seo_json(raw)

    merged = {
        **article,
        "seo_title":        seo.get("seo_title", article.get("title", "")),
        "meta_description": seo.get("meta_description", ""),
        "keywords":         seo.get("keywords", []),
    }

    print(f"[SEO] ✓ SEO title: {merged['seo_title'][:60]}")
    return merged
