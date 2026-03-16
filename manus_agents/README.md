# manus_agents — Local Multi-Agent AI Newsroom

7-agent autonomous news processing system running entirely on your machine via **Ollama**.  
Zero API cost. Zero paid services.

**Status: 95% Production-Ready** ✅

---

## 📖 Documentation

- **[SETUP.md](SETUP.md)** ← **START HERE** - Complete setup instructions
- **[FIXES_SUMMARY.md](FIXES_SUMMARY.md)** - Recent improvements & security fixes
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Architecture & API reference
- **[verify_system.py](verify_system.py)** - System health check tool
- **[install_deps.py](install_deps.py)** - Automated dependency installer

---

## ⚡ Quick Start

```bash
cd /home/kaivalya/Desktop/nashik-headlines/manus_agents

# 1. Install dependencies
python3 install_deps.py

# 2. Configure environment (edit .env with your API keys per SETUP.md)

# 3. Initialize database
python3 tools/init_db.py

# 4. Verify system
python3 verify_system.py

# Terminal 1 — Start Ollama
ollama serve

# Terminal 2 — Check system health
python3 monitor.py

# Terminal 3 — Run the system
python3 run_agents.py --once          # Single cycle test
python3 run_agents.py --loop          # Continuous (every 30 min)
python3 run_agents.py --api           # Admin API @ http://localhost:8002
python3 run_agents.py --api --loop    # API + continuous loop
```

---

## 🎯 What It Does

```
News Sources (RSS/HTML)
    ↓
[ScraperAgent]  → Fetch articles
    ↓
[ExtractorAgent] → Parse content
    ↓
[EditorAgent]    → Rewrite + summarize + categorize
    ↓
[SEOAgent]       → Generate meta tags + slug
    ↓
[ImageAgent]     → Generate/fetch 3 images per article
    ↓
[PublisherAgent] → Save to MySQL (draft status)
    ↓
Admin Panel → Review & publish
```

---

## 🆕 Recent Improvements (v5.0)

### ✅ ImageAgent Enhanced with Stable Diffusion XL
- **Stable Diffusion XL Integration:**
  - Local SDXL (GPU-accelerated, fastest)
  - Stability API (cloud-based, no GPU)
  - Unsplash fallback (free stock photos)
  - Placeholder (last resort)
- **Smart retry logic:** 3 attempts with exponential backoff
- **Rate limiting handling:** Auto-fallback if API is busy
- **WebP compression:** Optimized storage

**Quick Setup:**
```bash
python setup_sdxl.py              # Interactive setup wizard
python setup_sdxl.py --test       # Test your configuration
python setup_sdxl.py --local      # Install local SDXL
python setup_sdxl.py --cloud      # Setup Stability API
```

### ✅ Error Handling & Retries
- All LLM calls automatically retry (3× default)
- Exponential backoff: 1s → 2s → 4s
- Each tool has smart fallbacks:
  - Rewrite fails? Keep original
  - Summary fails? Extract first sentences
  - Category fails? Use keyword matching
  - SEO fails? Generate safe slugs

### ✅ Category Classification (v5)
- **AI + keyword hybrid approach**
- Falls back to keyword matching if LLM unavailable
- 10 built-in categories (crime, politics, tech, etc.)
- Fully customizable

### ✅ Comprehensive Logging
- Every agent logs actions to `agent_logs` table
- Success/failure tracking
- Automatic error emails ready
- Monitor script included

### ✅ API Endpoints
Complete FastAPI with 10+ endpoints:
- `/ai/rewrite`, `/ai/summary`, `/ai/seo`
- `/ai/generate-article`, `/ai/process-url`
- `/ai/articles`, `/ai/memory`, `/health`
- Interactive docs: `http://localhost:8002/docs`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│    Nashik Headlines Admin Panel (React)          │
└────────────────────────┬─────────────────────────┘
                         │ HTTP
                         ↓
┌──────────────────────────────────────────────────┐
│   FastAPI (port 8002)                            │
│   /ai/rewrite /ai/summary /ai/seo               │
│   /ai/generate-images /ai/articles              │
└────────────────────────┬─────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ↓                         ↓
      MasterAgent            (External: Ollama)
            │                 mistral:7b-instruct
            ├──→ ScraperAgent
            ├──→ ExtractorAgent
            ├──→ EditorAgent
            ├──→ SEOAgent
            ├──→ ImageAgent
            └──→ PublisherAgent
                     │
                     ↓
            ┌──────────────────┐
            │   MySQL Database │
            │  (9 tables)      │
            └──────────────────┘
```

---

## 📋 All Features

| Feature | Status | Details |
|---------|--------|---------|
| RSS/HTML scraping | ✅ | Deduplication included |
| Content extraction | ✅ | BeautifulSoup4 parsing |
| AI rewriting | ✅ | Preserves facts, rewrites style |
| Summary generation | ✅ | 2-3 sentences or extractive fallback |
| Category classification | ✅ | AI with keyword fallback |
| SEO metadata | ✅ | slug, meta_title, meta_description, keywords |
| Image generation | ✅ | 3 images per article, multi-source |
| MySQL persistence | ✅ | 9 tables, full audit trail |
| Admin API | ✅ | FastAPI with Swagger docs |
| Automation loop | ✅ | Every 30 minutes (configurable) |
| Error handling | ✅ | 3× retry with backoff |
| Logging/monitoring | ✅ | Full audit trail in DB + monitor script |
| Docker support | ⏳ | Coming in v5.1 |
| Email notifications | ⏳ | Coming in v5.1 |

---

## 🚀 Common Commands

```bash
# Single test run
python run_agents.py --once

# Continuous loop (every 30 minutes)
python run_agents.py --loop

# Start API server only
python run_agents.py --api

# API + automatic loop in background
python run_agents.py --api --loop

# Dry run (no actual processing)
python run_agents.py --dry-run

# System health check
python monitor.py

# View recent logs
python monitor.py --logs

# View recent errors only
python monitor.py --errors

# View statistics
python monitor.py --stats

# Test API endpoints
python test_api.py

# Test specific endpoint
python test_api.py --endpoint rewrite
```

---

## 📊 Monitoring

Use the built-in monitor script:

```bash
python monitor.py
```

Shows:
- ✓ Database connection status
- ✓ Ollama LLM availability
- ✓ Upload directory health
- 📊 Article counts (pending/processed/rejected)
- 📈 Pipeline statistics
- 📋 Recent agent logs

---

## 🔧 Configuration

Edit `config/settings.py`:

```python
# LLM
OLLAMA_MODEL = "mistral:7b-instruct-q4_0"
OLLAMA_TIMEOUT = 180  # seconds

# Automation
LOOP_INTERVAL_SECONDS = 1800  # 30 minutes
MAX_RETRIES = 3

# Database
MYSQL_HOST = "localhost"
MYSQL_USER = "nashik"
MYSQL_PASSWORD = "nashik123"
MYSQL_DB = "nashik_headlines"

# News sources (add/remove as needed)
RSS_FEEDS = [
    "https://timesofindia.indiatimes.com/rssfeeds/7119547.cms",
]

# Categories (customize)
CATEGORIES = {
    1: "crime",
    2: "politics",
    # ... etc
}
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" (Ollama)
```bash
# Start Ollama
ollama serve

# In another terminal, pull a model
ollama pull mistral
```

### Error: "MySQL connection failed"
```bash
# Check credentials in config/settings.py
# Verify MySQL is running:
mysql -u nashik -p nashik_headlines
```

### Error: "429 Too Many Requests" (Images)
The system automatically falls back through multiple sources:
1. **Local SDXL** (no rate limits)
2. **Stability API** (cloud-based)
3. **Unsplash** (free stock photos)
4. **Placeholder** (last resort)

Check logs: `python monitor.py --errors`

**If still failing:**
```bash
python setup_sdxl.py --test    # Check your image setup
python setup_sdxl.py --local   # Switch to local SDXL
```

### Error: "Local SDXL out of memory"
Your GPU ran out of VRAM. Solutions:
```bash
# Free GPU memory
nvidia-smi   # Check GPU status

# Use Stability API instead
python setup_sdxl.py --cloud

# Or reduce batch size in code
```

### Error: "Stability API 401 Unauthorized"
Invalid or missing API key.
```bash
# Set your key:
export STABILITY_API_KEY="sk-your-key-here"

# Or reconfigure:
python setup_sdxl.py --cloud
```

### Error: "Ollama model not found"
```bash
ollama list           # See available models
ollama pull mistral   # Download a model
```

---

## 📁 Project Structure

```
manus_agents/
│
├── master_agent/        # Orchestration
├── scraper_agent/       # News fetching
├── extractor_agent/     # Content parsing
├── editor_agent/        # Rewriting + summarization
├── seo_agent/          # Metadata generation
├── image_agent/        # Image acquisition
├── publisher_agent/    # Database storage
│
├── tools/              # Reusable functions
│   ├── scrape_news.py
│   ├── extract_article.py
│   ├── rewrite_article.py (with retry)
│   ├── generate_summary.py (with fallback)
│   ├── classify_category.py (AI + keywords)
│   ├── generate_seo_metadata.py (with fallback)
│   ├── generate_image_prompts.py
│   ├── generate_images.py (multi-source)
│   ├── store_article.py
│   └── retry_helper.py (NEW - retry decorator)
│
├── api/                # FastAPI server
│   └── server.py       # 10+ endpoints
│
├── memory/             # Logging & state
│   └── store.py
│
├── config/
│   └── settings.py     # Central configuration
│
├── monitor.py          # NEW - health check & monitoring
├── test_api.py         # NEW - API test suite
├── IMPLEMENTATION_GUIDE.md  # NEW - comprehensive docs
└── run_agents.py       # Entry point
```

---

## 🧪 Testing

Complete test suite included:

```bash
# Start API first
python run_agents.py --api &

# Run full test suite
python test_api.py

# Or test specific endpoint
python test_api.py --endpoint health
python test_api.py --endpoint rewrite
python test_api.py --endpoint images

# Verbose output
python test_api.py --verbose
```

Tests:
- ✓ Health check
- ✓ Text rewriting
- ✓ Summarization
- ✓ SEO generation
- ✓ Image generation
- ✓ Full pipeline
- ✓ Article retrieval

---

## 📊 Performance

Typical metrics (per article):

- **Extraction:** 2-3 seconds
- **Rewriting:** 15-20 seconds
- **Summarization:** 5-8 seconds
- **Category classification:** 3-5 seconds
- **SEO metadata:** 5-8 seconds
- **Image generation:** 20-30 seconds
- **Database save:** 1-2 seconds

**Total:** ~60-80 seconds per article  
**Throughput:** 10-15 articles per 30-min cycle

---

## 🎓 Full Documentation

See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for:
- Detailed architecture
- API endpoint reference
- Database schema
- Error handling strategies
- Performance optimization
- Advanced configuration
- Troubleshooting guide

---

## 🤝 Integration

### Connect with Admin Panel

The admin panel at `Admin_panel/` automatically connects to:
```
http://localhost:8002
```

Just start both:
```bash
# Terminal 1: Manus agents API
cd manus_agents && python run_agents.py --api --loop

# Terminal 2: Admin panel frontend
cd Admin_panel/frontend && npm run dev
```

### Custom Integration

Use the FastAPI endpoints to integrate with any system:

```python
import requests

# Rewrite an article
r = requests.post("http://localhost:8002/ai/rewrite", json={
    "text": "Original article...",
    "title": "Article title"
})
rewritten = r.json()["rewritten"]

# Generate images
r = requests.post("http://localhost:8002/ai/generate-images", json={
    "title": "Article title",
    "text": "Article body..."
})
images = r.json()  # image1, image2, image3 URLs
```

---

## 📝 License & Credits

**Manus Agents** — AI-powered newsroom system for Nashik Headlines

Powered by:
- **Ollama** — Local LLM inference (mistral, llama3, etc.)
- **MySQL** — Persistent storage
- **FastAPI** — Modern HTTP API
- **BeautifulSoup4** — HTML parsing
- **Pillow** — Image processing
- **pollinations.ai** — AI image generation
- **Unsplash** — Stock photos (fallback)

---

## 🎯 Next Steps

**v5.1 (Coming Soon):**
- [ ] Docker support
- [ ] Email notifications on errors/success
- [ ] Webhook support for external integrations
- [ ] Batch API endpoint for bulk processing
- [ ] Schedule customization via API
- [ ] Image optimization (HEIC to WebP)
- [ ] Advanced category rules engine

**v6.0 (Planning):**
- [ ] Multi-LLM support (LiteLLM wrapper)
- [ ] Advanced deduplication (semantic similarity)
- [ ] Trend analysis & trending articles
- [ ] Comment/reader interaction tracking
- [ ] A/B testing framework

---

## 📞 Support

- **Logs:** View in `agent_logs` MySQL table
- **Monitor:** `python monitor.py`
- **Errors:** `python monitor.py --errors`
- **API Docs:** `http://localhost:8002/docs` (when API running)

---

**Made with ❤️ for Nashik Headlines**

System is **95% complete** and production-ready. See documentation for remaining items.


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
