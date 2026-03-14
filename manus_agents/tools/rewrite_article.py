"""
tools/rewrite_article.py
Tool: rewrite_article(article: dict) -> dict
Uses local LLM to rewrite article body in Nashik Headlines style.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.store import log_error

_PROMPT = """You are a senior news editor for "Nashik Headlines", a trusted local news portal.

Rewrite the following article in completely original wording:
- Preserve every fact, name, date, and number.
- Write in clear, simple, engaging English.
- Keep paragraphs short (2-3 sentences).
- Do NOT invent any new information.
- Output ONLY the rewritten article text.

ORIGINAL:
{body}

REWRITTEN:"""


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
        log_error("editor_agent", f"rewrite LLM call failed: {exc}")
        return ""


def rewrite_article(article: dict) -> dict:
    """
    Input:  article dict with 'body'
    Output: same dict + 'rewritten_body'
    """
    body = article.get("body", "").strip()
    if not body:
        print("[rewrite_article] ⚠ Empty body — skipping LLM.")
        return {**article, "rewritten_body": ""}

    result = _llm(_PROMPT.format(body=body[:4000]))
    if not result:
        result = body  # fallback: keep original
    print(f"[rewrite_article] ✓ {len(result)} chars rewritten.")
    return {**article, "rewritten_body": result}
