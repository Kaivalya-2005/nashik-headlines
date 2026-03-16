"""
tools/generate_summary.py
Tool: generate_summary(article: dict) -> dict
Generates a short 2-3 sentence news summary via LLM.
Includes retry logic and fallback to extractive summarization.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
import logging
import re
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, MAX_RETRIES
from memory.store import log_error
from tools.retry_helper import retry_with_fallback

log = logging.getLogger("manus-agents")

_PROMPT = """You are a news summarizer for "Nashik Headlines".

Write a concise 2-3 sentence summary of the article below.
- Capture the most important facts only.
- Keep it neutral and factual.
- Output ONLY the summary text, nothing else.

ARTICLE:
{text}

SUMMARY:"""


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


def _extractive_summary(text: str, num_sentences: int = 3) -> str:
    """
    Fallback: Extract first N sentences from text.
    Useful when LLM fails.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    summary = ' '.join(sentences[:num_sentences])
    log.info(f"Fallback extractive summary: {len(summary)} chars")
    return summary


def generate_summary(article: dict) -> dict:
    """
    Input:  article dict (uses 'rewritten_body' or 'body')
    Output: same dict + 'summary'
    
    Fallback strategy:
    1. Try AI summarization
    2. Fall back to extracting first 3 sentences if LLM fails
    """
    text = article.get("rewritten_body") or article.get("body", "")
    
    if not text.strip():
        log.warning("[generate_summary] No text to summarize")
        return {**article, "summary": ""}
    
    try:
        summary = _llm(_PROMPT.format(text=text[:3000]))
        
        if not summary:
            log.warning("[generate_summary] LLM returned empty → using extractive fallback")
            summary = _extractive_summary(text)
        
        log.info(f"[generate_summary] Generated: {len(summary)} chars")
        print(f"[generate_summary] ✓ {len(summary)} chars.")
        return {**article, "summary": summary}
    
    except Exception as exc:
        log_error("generate_summary", str(exc))
        log.warning("[generate_summary] LLM failed → using extractive fallback")
        print(f"[generate_summary] ⚠ LLM failed, using extractive")
        summary = _extractive_summary(text)
        return {**article, "summary": summary}
