"""
planner.py
----------
The Planner turns a high-level task description into an ordered list of
tool steps using the local LLM.  It acts as the "thinking" layer of the
Mini-Manus architecture.
"""

import requests
import json
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from memory.memory_manager import log_error


PLAN_PROMPT = """You are an AI task planner for a news agency called "Nashik Headlines".

You have access to these tools:
- extract_article   → extracts clean text from a raw article
- rewrite_article   → rewrites the article in original words
- generate_summary  → creates a 2-3 sentence summary
- classify_category → classifies article into one category
- generate_seo      → generates SEO title, meta description, keywords
- save_to_database  → saves the processed article to the database

Given the task below, output ONLY a JSON array of tool names in the order they should be called.
Example output: ["extract_article", "rewrite_article", "generate_summary", "classify_category", "generate_seo", "save_to_database"]

TASK: {task}

JSON ARRAY:"""


VALID_STEPS = [
    "extract_article",
    "rewrite_article",
    "generate_summary",
    "classify_category",
    "generate_seo",
    "save_to_database",
]

DEFAULT_PLAN = [
    "extract_article",
    "rewrite_article",
    "generate_summary",
    "classify_category",
    "generate_seo",
    "save_to_database",
]


def _call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.RequestException as exc:
        log_error("planner", f"Ollama request failed: {exc}")
        return ""


def plan_task(task_description: str) -> list[str]:
    """
    Ask the LLM to build a tool-execution plan for the given task.

    Returns
    -------
    list of tool name strings (guaranteed to be valid tool names).
    Falls back to DEFAULT_PLAN if LLM output cannot be parsed.
    """
    prompt = PLAN_PROMPT.format(task=task_description)
    raw = _call_ollama(prompt)

    try:
        clean = raw.strip().strip("```json").strip("```").strip()
        steps = json.loads(clean)
        # Filter only valid tool names
        steps = [s for s in steps if s in VALID_STEPS]
        if steps:
            print(f"[Planner] 📋 Plan: {' → '.join(steps)}")
            return steps
    except (json.JSONDecodeError, TypeError):
        pass

    print(f"[Planner] ⚠ Could not parse plan, using default pipeline.")
    return DEFAULT_PLAN
