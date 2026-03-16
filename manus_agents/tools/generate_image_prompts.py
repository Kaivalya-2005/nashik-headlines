"""
tools/generate_image_prompts.py
IMAGE GENERATION DISABLED - All functionality commented out
"""

# IMAGE GENERATION HAS BEEN DISABLED
#
# import sys, os
# sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
#
# import json, re, requests
# from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
# from memory.store import log_error
#
# _PROMPT = """..."""
#
# def _llm(prompt: str) -> list:
#     try:
#         resp = requests.post(...)
#         ...
#     except Exception as exc:
#         log_error("image_agent", f"image prompts LLM failed: {exc}")
#         return []
#
# def generate_image_prompts(article: dict) -> dict:
#     """Adds: image_prompts — list of 3 dicts with {prompt, alt_text, caption}"""
#     # Returns article with empty image_prompts on disable
#     return {**article, "image_prompts": []}

