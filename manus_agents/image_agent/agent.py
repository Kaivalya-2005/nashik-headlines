"""
image_agent/agent.py
ImageAgent – generates an image prompt and a free stock image URL.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.generate_image_prompt import generate_image_prompt
from memory.store import log_task, log_error


class ImageAgent:
    name = "ImageAgent"

    def run(self, article: dict) -> dict:
        log_task(self.name, "started", article.get("url", ""))
        try:
            article = generate_image_prompt(article)
            log_task(self.name, "completed", article.get("image_prompt", "")[:60])
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return article
