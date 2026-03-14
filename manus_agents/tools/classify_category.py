"""
tools/classify_category.py
Tool: classify_category(article: dict) -> dict
Classifies article into one of the defined news categories.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, CATEGORIES
from memory.store import log_error

_PROMPT = """You are a news classifier for "Nashik Headlines".

Classify the article below into EXACTLY ONE of these categories:
{cats}

Reply with ONLY the single category name — nothing else.

ARTICLE:
{text}

CATEGORY:"""


def _llm(prompt: str) -> str:
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip().lower()
    except Exception as exc:
        log_error("editor_agent", f"classify LLM call failed: {exc}")
        return "local"


def classify_category(article: dict) -> dict:
    """
    Input:  article dict
    Output: same dict + 'category'
    """
    text = article.get("rewritten_body") or article.get("body", "")
    cats_str = ", ".join(CATEGORIES)
    raw = _llm(_PROMPT.format(cats=cats_str, text=text[:2000]))

    category = "local"
    for cat in CATEGORIES:
        if cat in raw:
            category = cat
            break

    print(f"[classify_category] ✓ {category}")
    return {**article, "category": category}
