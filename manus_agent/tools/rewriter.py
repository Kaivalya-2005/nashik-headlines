"""
rewriter.py
-----------
Uses the local LLM (via Ollama) to rewrite scraped news text
into original Nashik Headlines style.
"""

import requests
import json
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.memory_manager import log_error


REWRITE_PROMPT_TEMPLATE = """You are an expert news editor for "Nashik Headlines", a local news portal.

Rewrite the following article in your own words. Rules:
- Keep all facts, names, dates, and figures accurate.
- Write in clear, simple, engaging English.
- Keep paragraphs short (2-3 sentences each).
- Do NOT add any information not present in the original.
- Output ONLY the rewritten article text, nothing else.

ORIGINAL ARTICLE:
{text}

REWRITTEN ARTICLE:"""


def _call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "").strip()
    except requests.RequestException as exc:
        log_error("rewriter", f"Ollama request failed: {exc}")
        return ""


def rewrite_article(article: dict) -> dict:
    """
    Rewrite article body using the local LLM.

    Parameters
    ----------
    article : dict with at least 'body' key

    Returns
    -------
    Same dict with 'rewritten_body' key added.
    """
    body = article.get("body", "").strip()
    if not body:
        print("[Rewriter] ⚠ No body text to rewrite.")
        return {**article, "rewritten_body": ""}

    prompt = REWRITE_PROMPT_TEMPLATE.format(text=body[:4000])  # truncate for context window
    rewritten = _call_ollama(prompt)

    if rewritten:
        print(f"[Rewriter] ✓ Rewritten article ({len(rewritten)} chars).")
    else:
        print("[Rewriter] ⚠ LLM returned empty response; using original body.")
        rewritten = body

    return {**article, "rewritten_body": rewritten}
