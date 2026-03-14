"""
memory/store.py
---------------
Persistent agent memory backed by a JSON file.
Tracks processed URLs, task events, and error logs.
"""

import json
from datetime import datetime
from pathlib import Path

_MEMORY_FILE = Path(__file__).parent / "data.json"


def _load() -> dict:
    try:
        with open(_MEMORY_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"processed_urls": [], "task_log": [], "error_log": []}


def _save(data: dict):
    with open(_MEMORY_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ── Public API ─────────────────────────────────────────────────────────────────

def is_processed(url: str) -> bool:
    return url in _load()["processed_urls"]


def mark_processed(url: str):
    mem = _load()
    if url not in mem["processed_urls"]:
        mem["processed_urls"].append(url)
    _save(mem)


def log_task(agent: str, status: str, detail: str = ""):
    mem = _load()
    mem["task_log"].append({
        "agent": agent, "status": status,
        "detail": detail,
        "ts": datetime.utcnow().isoformat(),
    })
    mem["task_log"] = mem["task_log"][-100:]
    _save(mem)


def log_error(agent: str, error: str):
    mem = _load()
    mem["error_log"].append({
        "agent": agent, "error": error,
        "ts": datetime.utcnow().isoformat(),
    })
    mem["error_log"] = mem["error_log"][-50:]
    _save(mem)


def get_snapshot() -> dict:
    return _load()
