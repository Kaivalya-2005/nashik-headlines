"""
config/settings.py
------------------
Central configuration for the manus_agents multi-agent system.
"""

# ── Ollama Local LLM ───────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL    = "mistral"      # swap to "llama3", "deepseek-r1" etc.
OLLAMA_TIMEOUT  = 120            # seconds per LLM call

# ── Automation ─────────────────────────────────────────────────────────────────
LOOP_INTERVAL_SECONDS = 1800     # 30 min between scrape cycles
MAX_RETRIES           = 3        # per-tool retry limit

# ── Database ───────────────────────────────────────────────────────────────────
DB_PATH = "nashik_headlines.db"

# ── News sources (RSS feeds preferred, HTML pages as fallback) ─────────────────
RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/7119547.cms",   # Nashik TOI
    "https://www.ndtv.com/topic/nashik/feed",
]

SCRAPE_URLS = [
    "https://timesofindia.indiatimes.com/city/nashik",
    "https://www.ndtv.com/topic/nashik",
]

# ── Categories ─────────────────────────────────────────────────────────────────
CATEGORIES = [
    "crime", "politics", "business", "sports",
    "entertainment", "education", "health",
    "technology", "environment", "local",
]

# ── Unsplash (free, no key needed for source.unsplash.com) ────────────────────
UNSPLASH_BASE = "https://source.unsplash.com/1200x628/?"

# ── Admin API ─────────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8002
