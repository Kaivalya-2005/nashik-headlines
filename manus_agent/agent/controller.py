"""
controller.py
-------------
The Agent Controller: orchestrates the full article processing pipeline.
It calls the Planner, then executes each tool step in order.
"""

import sys
import os

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent.planner import plan_task
from tools.extractor   import extract_article
from tools.rewriter    import rewrite_article
from tools.summarizer  import generate_summary
from tools.categorizer import classify_category
from tools.seo         import generate_seo
from tools.database    import save_to_database
from memory.memory_manager import log_task, log_error


# Map string tool names → actual functions
TOOL_REGISTRY = {
    "extract_article":   extract_article,
    "rewrite_article":   rewrite_article,
    "generate_summary":  generate_summary,
    "classify_category": classify_category,
    "generate_seo":      generate_seo,
    "save_to_database":  save_to_database,
}


def process_article(article_stub: dict, task_description: str = "Process new news article") -> dict:
    """
    Run the full agent pipeline on a single article stub.

    Parameters
    ----------
    article_stub      : dict with at least {title, url, source}
    task_description  : human-readable task string fed to the Planner

    Returns
    -------
    Final article dict with all enriched fields.
    """
    url = article_stub.get("url", "unknown")
    print(f"\n{'='*60}")
    print(f"[Controller] 🚀 Processing: {url[:60]}")
    print(f"{'='*60}")

    log_task("process_article", "started", url)

    # 1. Ask Planner for an execution plan
    steps = plan_task(task_description)

    # 2. Execute each tool step
    article = article_stub
    for step in steps:
        tool_fn = TOOL_REGISTRY.get(step)
        if tool_fn is None:
            print(f"[Controller] ⚠ Unknown tool '{step}', skipping.")
            continue
        try:
            print(f"[Controller] ⚙  Running → {step}")
            article = tool_fn(article)
        except Exception as exc:
            log_error(step, str(exc))
            print(f"[Controller] ✗ Error in {step}: {exc}")
            # Continue pipeline even on non-fatal errors

    log_task("process_article", "completed", url)
    print(f"[Controller] ✅ Done: {url[:60]}\n")
    return article


def run_single_rewrite(text: str) -> str:
    """
    Convenience method used by the admin API —
    rewrite a piece of text without the full pipeline.
    """
    dummy = {"url": "manual", "title": "Manual Rewrite", "source": "admin", "body": text}
    result = rewrite_article(dummy)
    return result.get("rewritten_body", text)


def run_single_summary(text: str) -> str:
    """Convenience: generate a summary from raw text."""
    dummy = {"url": "manual", "title": "Manual Summary", "source": "admin", "body": text}
    result = generate_summary(dummy)
    return result.get("summary", "")


def run_single_seo(text: str, title: str = "") -> dict:
    """Convenience: generate SEO metadata from raw text."""
    dummy = {"url": "manual", "title": title or "Manual SEO", "source": "admin", "body": text}
    result = generate_seo(dummy)
    return {
        "seo_title":        result.get("seo_title", ""),
        "meta_description": result.get("meta_description", ""),
        "keywords":         result.get("keywords", []),
    }
