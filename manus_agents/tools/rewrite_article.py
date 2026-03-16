"""
tools/rewrite_article.py
Tool: rewrite_article(article: dict) -> dict
Uses local LLM to completely rewrite article body while preserving facts.
Includes retry logic for handling transient failures.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
import logging
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, MAX_RETRIES
from memory.store import log_error
from tools.retry_helper import retry_with_fallback

log = logging.getLogger("manus-agents")

_PROMPT = """You are a senior news editor for "Nashik Headlines", a trusted local news portal.

Your task is to COMPLETELY REWRITE the following article using entirely original wording.

STRICT RULES:
1. PRESERVE ALL FACTS: Every name, date, number, location, and quote must remain exactly as in the original.
2. Use COMPLETELY DIFFERENT sentence structures and vocabulary from the original.
3. NO INVENTIONS: Do NOT hallucinate or add any new information.
4. Write in clear, professional, engaging English.
5. Keep paragraphs short (2-3 sentences each).
6. Structure the article with a strong opening, detailed body, and conclusion.
7. Output ONLY the rewritten article text. No preamble, no labels.

ORIGINAL ARTICLE:
{body}

REWRITTEN ARTICLE:"""


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


def rewrite_article(article: dict) -> dict:
    """
    Input:  article dict with 'body'
    Output: same dict + 'rewritten_body'
    
    With retry logic, falls back to original if all LLM attempts fail.
    """
    body = article.get("body", "").strip()
    if not body:
        log.warning("[rewrite_article] Empty body — skipping LLM.")
        return {**article, "rewritten_body": ""}

    try:
        result = _llm(_PROMPT.format(body=body[:4000]))
        if not result:
            log.warning("[rewrite_article] LLM returned empty, using fallback.")
            result = body  # fallback: keep original
        log.info(f"[rewrite_article] Rewritten: {len(result)} chars.")
        print(f"[rewrite_article] ✓ {len(result)} chars rewritten.")
        return {**article, "rewritten_body": result}
    except Exception as exc:
        log_error("rewrite_article", str(exc))
        log.error(f"[rewrite_article] Failed, using original body: {exc}")
        print(f"[rewrite_article] ⚠ LLM failed, using original.")
        return {**article, "rewritten_body": body}
