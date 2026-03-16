"""
tools/classify_category.py
Tool: classify_category(article: dict) -> dict
Classifies article into one of the defined news categories.
Uses AI classification with keyword-based fallback for robustness.
Returns category_id (int).
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
import logging
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, CATEGORIES, CATEGORY_NAME_TO_ID, MAX_RETRIES
from memory.store import log_error
from tools.retry_helper import retry_with_fallback

log = logging.getLogger("manus-agents")

_PROMPT = """You are a news classifier for "Nashik Headlines".

Classify the article below into EXACTLY ONE of these categories:
{cats}

Reply with ONLY the single category name — nothing else.

ARTICLE:
{text}

CATEGORY:"""

# Keyword mappings for fallback classification
_KEYWORD_RULES = {
    "crime": ["murder", "theft", "robbery", "assault", "police", "arrest", "accident", "death", "killed", "injured", "violence"],
    "politics": ["election", "politician", "government", "minister", "parliament", "vote", "political", "campaign", "congress"],
    "business": ["business", "market", "stock", "trade", "commerce", "industry", "company", "profit", "investment", "sales"],
    "sports": ["sport", "match", "game", "player", "team", "cricket", "football", "score", "tournament", "league"],
    "entertainment": ["film", "movie", "actor", "actress", "music", "concert", "celebrity", "show", "entertainment", "bollywood"],
    "education": ["school", "student", "education", "exam", "college", "university", "teacher", "learning", "course"],
    "health": ["health", "medical", "doctor", "hospital", "disease", "medicine", "cancer", "patient", "treatment", "illness"],
    "technology": ["technology", "tech", "software", "internet", "digital", "computer", "app", "ai", "data", "cyber"],
    "environment": ["environment", "climate", "pollution", "nature", "green", "forest", "water", "air", "ecological", "sustainability"],
    "local": ["nashik", "local", "city", "municipal", "community", "resident", "area"]
}


@retry_with_fallback(max_attempts=MAX_RETRIES, delay=1.0, backoff=2.0, fallback_value="local")
def _llm(prompt: str) -> str:
    """Call local LLM for classification with retry logic."""
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=OLLAMA_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json().get("response", "").strip().lower()


def _classify_by_keywords(text: str) -> str:
    """Fallback keyword-based classification."""
    text_lower = text.lower()
    category_scores = {}
    
    for category, keywords in _KEYWORD_RULES.items():
        score = sum(text_lower.count(kw) for kw in keywords)
        if score > 0:
            category_scores[category] = score
    
    if category_scores:
        best_cat = max(category_scores, key=category_scores.get)
        log.info(f"Keyword classification: {best_cat} (score={category_scores[best_cat]})")
        return best_cat
    
    log.warning("No keywords matched, defaulting to 'local'")
    return "local"


def classify_category(article: dict) -> dict:
    """
    Input:  article dict
    Output: same dict + 'category' (str) + 'category_id' (int)
    
    Classification strategy:
    1. Try AI classification
    2. Parse LLM response to match category
    3. Fall back to keyword-based classification if LLM fails or returns invalid response
    """
    text = article.get("rewritten_body") or article.get("body", "")
    if not text:
        log.warning("[classify_category] No text to classify, defaulting to 'local'")
        return {**article, "category": "local", "category_id": 10}
    
    cats_str = ", ".join(CATEGORIES.values())
    
    try:
        # Try LLM classification first
        raw = _llm(_PROMPT.format(cats=cats_str, text=text[:2000]))
        
        # Validate LLM response
        category = None
        for cat_name in CATEGORIES.values():
            if cat_name in raw:
                category = cat_name
                log.info(f"[classify_category] AI classification: {category}")
                break
        
        # If LLM response is invalid, fall back to keywords
        if not category:
            log.warning(f"[classify_category] Invalid LLM response: '{raw}' → falling back to keywords")
            category = _classify_by_keywords(text)
    
    except Exception as exc:
        # If LLM fails completely, use keyword fallback
        log_error("classify_category", f"AI classification failed: {exc}")
        log.warning(f"[classify_category] AI failed → falling back to keywords")
        category = _classify_by_keywords(text)
    
    category_id = CATEGORY_NAME_TO_ID.get(category, 10)
    print(f"[classify_category] ✓ {category} (id={category_id})")
    return {**article, "category": category, "category_id": category_id}
