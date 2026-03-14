"""
summarizer.py
-------------
Generates a concise 2-3 sentence summary of a rewritten article.
"""

import requests
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.memory_manager import log_error


SUMMARY_PROMPT_TEMPLATE = """You are a news summarizer for "Nashik Headlines".

Write a concise 2-3 sentence summary of the following news article.
- Capture the most important facts.
- Keep it clear and neutral.
- Output ONLY the summary, nothing else.

ARTICLE:
{text}

SUMMARY:"""


def _call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.RequestException as exc:
        log_error("summarizer", f"Ollama request failed: {exc}")
        return ""


def generate_summary(article: dict) -> dict:
    """
    Generate a short summary from 'rewritten_body' (falls back to 'body').

    Returns
    -------
    Same dict with 'summary' key added.
    """
    text = article.get("rewritten_body") or article.get("body", "")
    if not text.strip():
        return {**article, "summary": ""}

    prompt = SUMMARY_PROMPT_TEMPLATE.format(text=text[:3000])
    summary = _call_ollama(prompt)

    print(f"[Summarizer] ✓ Summary generated ({len(summary)} chars).")
    return {**article, "summary": summary}
