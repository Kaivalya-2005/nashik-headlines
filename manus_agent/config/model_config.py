"""
model_config.py
---------------
Central configuration for the Mini-Manus agent system.
Adjust OLLAMA_MODEL to switch between llama3, mistral, deepseek-r1, etc.
"""

# ── Ollama LLM settings ────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL    = "llama3"          # swap to "mistral" or "deepseek-r1" as needed
OLLAMA_TIMEOUT  = 120               # seconds

# ── Agent behaviour ────────────────────────────────────────────────────────────
AGENT_LOOP_INTERVAL_SECONDS = 1800  # 30 minutes between scrape cycles
MAX_RETRIES                 = 3     # retries per tool call on failure
DEBUG_MODE                  = True  # verbose logging while building

# ── News sources (add/remove freely) ──────────────────────────────────────────
NEWS_SOURCES = [
    "https://timesofindia.indiatimes.com/city/nashik",
    "https://www.lokmat.com/nashik/",
    "https://www.ndtv.com/topic/nashik",
]

# ── Database (SQLite for local dev; swap conn string for Postgres/MySQL) ───────
DB_PATH = "nashik_headlines.db"

# ── News categories ────────────────────────────────────────────────────────────
CATEGORIES = [
    "crime",
    "politics",
    "business",
    "sports",
    "entertainment",
    "education",
    "health",
    "technology",
    "environment",
    "local",
]
