"""
tools/generate_summary.py
Tool: generate_summary(article: dict) -> dict
Generates a short 2-3 sentence news summary via LLM.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.store import log_error

_PROMPT = """You are a news summarizer for "Nashik Headlines".

Write a concise 2-3 sentence summary of the article below.
- Capture the most important facts only.
- Keep it neutral and factual.
- Output ONLY the summary text, nothing else.

ARTICLE:
{text}

SUMMARY:"""


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
        log_error("editor_agent", f"summary LLM call failed: {exc}")
        return ""


def generate_summary(article: dict) -> dict:
    """
    Input:  article dict (uses 'rewritten_body' or 'body')
    Output: same dict + 'summary'
    """
    text = article.get("rewritten_body") or article.get("body", "")
    summary = _llm(_PROMPT.format(text=text[:3000])) if text.strip() else ""
    print(f"[generate_summary] ✓ {len(summary)} chars.")
    return {**article, "summary": summary}
