"""
tools/generate_image_prompts.py
Tool: generate_image_prompts(article: dict) -> dict
Uses LLM to produce three detailed image prompts, alt-texts, and captions.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json, re, requests
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.store import log_error

_PROMPT = """You are a visual art director for a news website called "Nashik Headlines".

Based on the news article below, generate THREE different image descriptions.

For each image, provide:
- "prompt": A highly detailed image generation prompt describing a photorealistic news photograph (no text overlays, no watermarks, cinematic lighting). Max 40 words.
- "alt_text": A concise alt-text for screen readers (max 15 words).
- "caption": A short caption for the image (max 20 words).

Each image should depict a DIFFERENT aspect or scene from the article.

Respond with VALID JSON ONLY in this exact format:
[
  {{"prompt": "...", "alt_text": "...", "caption": "..."}},
  {{"prompt": "...", "alt_text": "...", "caption": "..."}},
  {{"prompt": "...", "alt_text": "...", "caption": "..."}}
]

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{content}"""


def _llm(prompt: str) -> list:
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
        text = resp.json().get("response", "").strip()

        # Robustly extract JSON array
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            text = match.group(0)

        return json.loads(text)
    except Exception as exc:
        log_error("image_agent", f"image prompts LLM failed: {exc}")
        return []


def generate_image_prompts(article: dict) -> dict:
    """
    Adds:
      image_prompts — list of 3 dicts with {prompt, alt_text, caption}
    """
    title   = article.get("title", "")
    content = article.get("rewritten_body", "") or article.get("body", "")

    prompts = _llm(_PROMPT.format(title=title, content=content[:2000]))

    # Validate and ensure we have exactly 3
    if not isinstance(prompts, list) or len(prompts) < 3:
        # Generate fallback prompts
        fallback = {
            "prompt": f"A photorealistic news photograph related to: {title[:50]}, cinematic lighting, 8k resolution",
            "alt_text": f"News image for {title[:30]}",
            "caption": title[:50],
        }
        while len(prompts) < 3:
            prompts.append(fallback.copy())

    prompts = prompts[:3]  # trim to exactly 3
    print(f"[generate_image_prompts] ✓ Generated {len(prompts)} image prompts.")
    return {**article, "image_prompts": prompts}
