"""
categorizer.py
--------------
Classifies a news article into one of the configured categories using the LLM.
"""

import requests
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, CATEGORIES
from memory.memory_manager import log_error


CATEGORY_PROMPT_TEMPLATE = """You are a news classifier for "Nashik Headlines".

Classify the following article into EXACTLY ONE of these categories:
{categories}

- Reply with ONLY the category name, nothing else.

ARTICLE:
{text}

CATEGORY:"""


def _call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("response", "").strip().lower()
    except requests.RequestException as exc:
        log_error("categorizer", f"Ollama request failed: {exc}")
        return "local"


def classify_category(article: dict) -> dict:
    """
    Classify article into one of the CATEGORIES.

    Returns
    -------
    Same dict with 'category' key added.
    """
    text = article.get("rewritten_body") or article.get("body", "")
    categories_str = ", ".join(CATEGORIES)

    prompt = CATEGORY_PROMPT_TEMPLATE.format(
        categories=categories_str,
        text=text[:2000],
    )
    raw = _call_ollama(prompt)

    # Ensure the response is a valid category
    category = "local"
    for cat in CATEGORIES:
        if cat in raw:
            category = cat
            break

    print(f"[Categorizer] ✓ Category: {category}")
    return {**article, "category": category}
