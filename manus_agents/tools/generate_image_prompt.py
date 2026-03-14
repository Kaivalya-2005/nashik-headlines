"""
tools/generate_image_prompt.py
Tool: generate_image_prompt(article: dict) -> dict
Uses LLM to produce a Stable Diffusion / DALL-E style image prompt.
Also constructs a free Unsplash source URL based on keywords.
No paid APIs required.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from urllib.parse import quote_plus
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, UNSPLASH_BASE
from memory.store import log_error

_PROMPT = """You are a visual art director for a news website.

Write a single short image generation prompt (max 20 words) for the article below.
The prompt should describe a photorealistic news photograph — no text, no watermarks.
Output ONLY the prompt text, nothing else.

ARTICLE TITLE: {title}

SUMMARY:
{summary}

IMAGE PROMPT:"""


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
        log_error("image_agent", f"image prompt LLM call failed: {exc}")
        return ""


def generate_image_prompt(article: dict) -> dict:
    """
    Adds:
      image_prompt      — text prompt for image generation
      image_url         — free Unsplash URL (no key required)
    """
    title   = article.get("title", "")
    summary = article.get("summary", "") or article.get("body", "")[:300]

    img_prompt = _llm(_PROMPT.format(title=title, summary=summary))
    if not img_prompt:
        img_prompt = f"News photograph about {title[:60]}"

    # Build free Unsplash URL from first 3 keywords or from title words
    keywords = article.get("keywords", [])
    if not keywords:
        keywords = title.lower().split()[:3]
    unsplash_url = UNSPLASH_BASE + quote_plus(",".join(keywords[:3]))

    print(f"[generate_image_prompt] ✓ prompt={img_prompt[:60]}")
    return {**article, "image_prompt": img_prompt, "image_url": unsplash_url}
