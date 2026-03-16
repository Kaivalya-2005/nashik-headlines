"""
image_agent/agent.py
ImageAgent – generates 3 image prompts, downloads images, and generates alt-text/captions.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tools.generate_image_prompts import generate_image_prompts
from tools.generate_images import generate_images
from memory.store import log_task, log_error


class ImageAgent:
    name = "ImageAgent"

    def run(self, article: dict) -> dict:
        try:
            log_task(self.name, f"started: {article.get('url', '')}")
            # Step 1: Generate 3 image prompts + alt + caption
            article = generate_image_prompts(article)

            # Step 2: Download and save images
            log_task(self.name, f"started: {article.get('url', '')}")
            article = generate_images(article)

            log_task(self.name, f"completed: images: {article.get('image1', '')[:40]}")
            return article
        except Exception as exc:
            log_error(self.name, str(exc))
            print(f"[{self.name}] ✗ {exc}")
            return {**article, "image1": "", "image2": "", "image3": ""}
