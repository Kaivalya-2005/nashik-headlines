"""
config/settings.py
------------------
Central configuration for the manus_agents multi-agent system.
"""

import os

# ── Ollama Local LLM ───────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL    = "mistral:7b-instruct-q4_0"
OLLAMA_TIMEOUT  = 180            # seconds per LLM call

# ── Automation ─────────────────────────────────────────────────────────────────
LOOP_INTERVAL_SECONDS = 1800     # 30 min between scrape cycles
MAX_RETRIES           = 3        # per-tool retry limit

# ── MySQL Database ─────────────────────────────────────────────────────────────
MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER     = os.getenv("MYSQL_USER", "nashik")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "nashik123")
MYSQL_DB       = os.getenv("MYSQL_DB", "nashik_headlines")
MYSQL_PORT     = int(os.getenv("MYSQL_PORT", "3306"))

# ── Image Generation ───────────────────────────────────────────────────────────
# Stable Diffusion XL Configuration
USE_LOCAL_SDXL = False  # Use local SDXL if torch/diffusers available; else use cloud API
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")  # Get from stability.ai or .env

# Unsplash Configuration (secondary fallback)
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")  # Access key for authenticated requests
UNSPLASH_APP_ID = int(os.getenv("UNSPLASH_APP_ID", "0")) or 897160  # Application ID
UNSPLASH_SECRET_KEY = os.getenv("UNSPLASH_SECRET_KEY", "")  # Secret key for OAuth (optional)

# Fallback image source (always available)
# - Local SDXL: Fastest, full control, requires GPU
# - Stability API: Cloud-based SDXL, high quality, requires API key
# - Unsplash: Free/premium stock photos, optional API key for more requests
# - Placeholder: Simple gray image (last resort)

# ── Image uploads ──────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads", "articles")

# ── News sources ───────────────────────────────────────────────────────────────
RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/7119547.cms",   # Nashik TOI
    "https://www.ndtv.com/topic/nashik/feed",
]

SCRAPE_URLS = [
    "https://timesofindia.indiatimes.com/city/nashik",
    "https://www.ndtv.com/topic/nashik",
]

# ── Categories (id → name mapping) ────────────────────────────────────────────
CATEGORIES = {
    1: "crime",
    2: "politics",
    3: "business",
    4: "sports",
    5: "entertainment",
    6: "education",
    7: "health",
    8: "technology",
    9: "environment",
    10: "local",
}

# reverse lookup
CATEGORY_NAME_TO_ID = {v: k for k, v in CATEGORIES.items()}

# ── Admin API ─────────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8002
