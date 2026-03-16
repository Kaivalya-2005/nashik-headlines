"""
editor_agent/agent.py
EditorAgent – rewrites the article, generates a summary, headline,
              and classifies category using the local LLM.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from tools.rewrite_article  import rewrite_article
from tools.generate_summary import generate_summary
from tools.classify_category import classify_category
from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.store import log_task, log_error

_HEADLINE_PROMPT = """You are a headline writer for "Nashik Headlines".

Write one punchy, factual news headline (max 12 words) for:

TITLE: {title}
SUMMARY: {summary}

Respond with ONLY the headline text. No quotes, no labels."""


class EditorAgent:
    name = "EditorAgent"

    def _improved_headline(self, article: dict) -> str:
        prompt = _HEADLINE_PROMPT.format(
            title=article.get("title", ""),
            summary=article.get("summary", "")[:300],
        )
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
                timeout=OLLAMA_TIMEOUT,
            )
            resp.raise_for_status()
            headline = resp.json().get("response", "").strip()
            # Clean up: remove quotes if LLM wrapped it
            headline = headline.strip('"').strip("'")
            return headline or article.get("title", "")
        except Exception as exc:
            log_error(self.name, f"headline LLM: {exc}")
            return article.get("title", "")

    def run(self, article: dict) -> dict:
        """
        Input:  article dict with 'body'
        Output: article enriched with rewritten_body, summary, category, category_id, title
        """
        log_task(self.name, f"started: {article.get('url', '')}")
        try:
            article = rewrite_article(article)
            article = generate_summary(article)
            article = classify_category(article)
            headline = self._improved_headline(article)
            article = {**article, "title": headline}
            log_task(self.name, f"completed: {article.get('url', '')}")
            print(f"[{self.name}] ✓ title='{headline[:60]}'")
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return article
