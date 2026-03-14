# manus_agents — Local Multi-Agent AI Newsroom

7-agent autonomous news processing system running entirely on your machine via **Ollama**.  
Zero API cost. Zero paid services.

---

## Quick Start

```bash
cd /home/kaivalya/Desktop/manus_agents
source .venv/bin/activate

# Terminal 1 — start Ollama
ollama serve
ollama pull mistral       # or llama3

# Terminal 2 — run the system
python run_agents.py --dry-run       # smoke test (no network/LLM)
python run_agents.py --once          # one scrape → publish cycle
python run_agents.py --api           # admin API @ http://localhost:8002/docs
python run_agents.py --api --loop    # API + continuous 30-min loop
```

---

## Architecture

```
User / Cron / Admin Panel
          │
    ┌─────▼──────────┐
    │  MasterAgent   │   ← Orchestrator
    └─────┬──────────┘
          │ coordinates
    ┌─────┴──────────────────────────────────────┐
    ▼           ▼           ▼           ▼         ▼         ▼
ScraperAgent  Extractor  Editor    SEOAgent  ImageAgent  Publisher
    │          Agent      Agent        │          │         Agent
    │            │          │          │          │           │
  RSS/HTML     BS4/np3k  Rewrite   slug/meta   prompt     SQLite
              extract    Summary   keywords    Unsplash   status=draft
                         Headline
                         Category
          └──────────────────────────────────────────────────┘
                        Local Ollama LLM (Mistral / Llama3)
```

---

## Project Structure

```
manus_agents/
│
├── run_agents.py             ← Entry point
├── requirements.txt
│
├── config/settings.py        ← Model, sources, DB, API port
├── memory/store.py           ← JSON-backed dedup + logs
├── memory/data.json          ← Persistent state
│
├── tools/                    ← Shared tool functions
│   ├── scrape_news.py        → RSS + HTML scraper
│   ├── extract_article.py    → newspaper3k + BS4
│   ├── rewrite_article.py    → LLM rewrite
│   ├── generate_summary.py   → LLM 2-3 sentence summary
│   ├── classify_category.py  → LLM category
│   ├── generate_seo_metadata.py → LLM: slug, meta_title, meta_desc, keywords
│   ├── generate_image_prompt.py → LLM prompt + Unsplash URL
│   └── store_article.py      → SQLite (status=draft)
│
├── master_agent/agent.py     ← MasterAgent — full pipeline orchestrator
├── scraper_agent/agent.py
├── extractor_agent/agent.py
├── editor_agent/agent.py     ← rewrite + summary + headline + classify
├── seo_agent/agent.py
├── image_agent/agent.py
├── publisher_agent/agent.py
│
└── api/server.py             ← FastAPI admin API (port 8002)
```

---

## Admin API Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Ollama + API status |
| POST | `/ai/rewrite` | `{text}` | Rewrite article text |
| POST | `/ai/summary` | `{text}` | Generate 2-3 sentence summary |
| POST | `/ai/seo` | `{text, title}` | slug + meta + keywords |
| POST | `/ai/process-url` | `{url, title, source}` | Full pipeline on URL |
| GET | `/ai/articles` | `?limit&category&status` | List saved articles |
| GET | `/ai/memory` | — | Agent memory snapshot |

Interactive docs: **http://localhost:8002/docs**

---

## Switch LLM Model

Edit `config/settings.py`:

```python
OLLAMA_MODEL = "mistral"   # → "llama3", "deepseek-r1", "phi3", etc.
```

---

## Add News Sources

```python
RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/7119547.cms",
    "https://your-new-rss-feed.com/feed",
]
SCRAPE_URLS = [
    "https://your-website.com/news",
]
```
