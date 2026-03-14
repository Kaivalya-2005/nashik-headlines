"""
memory_manager.py
-----------------
Reads/writes the persistent agent_memory.json file.
Prevents re-processing articles and logs tasks/errors.
"""

import json
import os
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path(__file__).parent / "agent_memory.json"


def _load() -> dict:
    try:
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"processed_articles": [], "recent_tasks": [], "error_logs": []}


def _save(data: dict):
    with open(MEMORY_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ── Public API ─────────────────────────────────────────────────────────────────

def is_processed(url: str) -> bool:
    """Return True if this URL has already been processed."""
    mem = _load()
    return url in mem["processed_articles"]


def mark_processed(url: str):
    """Mark a URL as processed so it is never re-processed."""
    mem = _load()
    if url not in mem["processed_articles"]:
        mem["processed_articles"].append(url)
    _save(mem)


def log_task(task_name: str, status: str, detail: str = ""):
    """Append a task event to recent_tasks (keeps last 100)."""
    mem = _load()
    entry = {
        "task": task_name,
        "status": status,
        "detail": detail,
        "timestamp": datetime.utcnow().isoformat(),
    }
    mem["recent_tasks"].append(entry)
    mem["recent_tasks"] = mem["recent_tasks"][-100:]
    _save(mem)


def log_error(tool: str, error: str):
    """Append an error entry to error_logs (keeps last 50)."""
    mem = _load()
    entry = {
        "tool": tool,
        "error": error,
        "timestamp": datetime.utcnow().isoformat(),
    }
    mem["error_logs"].append(entry)
    mem["error_logs"] = mem["error_logs"][-50:]
    _save(mem)


def get_memory_snapshot() -> dict:
    """Return the full memory state (for the admin panel or debugging)."""
    return _load()
