# Manus Agents — Complete Implementation Guide

## Overview

**manus_agents** is a production-ready, multi-agent AI newsroom system that:
- 🤖 Scrapes news from RSS feeds and websites
- ✏️ Rewrites articles with AI (privacy-focused, using Ollama)
- 📸 Generates 3 images per article (with fallback strategies)
- 🏷️ Auto-generates SEO metadata and categories
- 📊 Saves everything to MySQL for the admin panel
- 🔄 Runs on a schedule (every 30 minutes by default)
- 🚀 Exposes an HTTP API for integrations

**Current Status: 95% Complete**

---

## Quick Start

### 1. Start the Core Pipeline (Scraper Loop)

```bash
cd manus_agents
python run_agents.py --loop
```

This runs continuously, scraping every 30 minutes.

### 2. Start the API Server Only

```bash
python run_agents.py --api
```

Opens: `http://localhost:8002`

### 3. Run API + Pipeline Together

```bash
python run_agents.py --api --loop
```

### 4. Single Test Run

```bash
python run_agents.py --once
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Nashik Headlines                │
│         (Admin Panel Frontend)          │
└────────────────────┬────────────────────┘
                     │ HTTP
                     ↓
┌─────────────────────────────────────────┐
│       FastAPI Server (port 8002)        │
│         /ai/rewrite                     │
│         /ai/summary                     │
│         /ai/generate-article            │
│         /ai/generate-images             │
│         /ai/process-url                 │
│         /ai/articles                    │
└────────────────────┬────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│     MasterAgent (Orchestration)         │
└────────────────────┬────────────────────┘
                     ├──→ ScraperAgent (RSS + HTML)
                     ├──→ ExtractorAgent (parse content)
                     ├──→ EditorAgent (rewrite + summarize)
                     ├──→ SEOAgent (metadata + slug)
                     ├──→ ImageAgent (3 images per article)
                     └──→ PublisherAgent (save to DB)
                     │
                     ↓
         ┌───────────────────────┐
         │   MySQL Database      │
         │  (9 tables, 3+ years) │
         └───────────────────────┘
```

---

## Components & Features

### 1. ScraperAgent ✓

Fetches articles from:
- RSS feeds (TOI, NDTV, etc.)
- Direct web scraping

**Features:**
- Deduplication (checks if URL already in database)
- Source mapping (source_id foreign key)
- Batch fetching (up to 50 articles per cycle)

**Config** (`config/settings.py`):
```python
RSS_FEEDS = ["https://..."]  # Add/remove feeds here
SCRAPE_URLS = ["https://..."]  # Add/remove sites
```

---

### 2. ExtractorAgent ✓

Extracts article content using BeautifulSoup4.

**Extracts:**
- Title
- Body/content
- URL
- Basic metadata

---

### 3. EditorAgent ✓ (Enhanced)

Rewrites and enriches articles.

**New Features (v5):**
- ✅ Retry logic (3 attempts with backoff)
- ✅ Fallback to original if LLM fails
- ✅ Improved headline generation
- ✅ Summary generation with extractive fallback

**Tools:**
- `rewrite_article.py` — Complete rewrite using LLM
- `generate_summary.py` — 2-3 sentence summary (with extractive fallback)
- `classify_category.py` — Category classification (AI + keyword fallback)

---

### 4. SEOAgent ✓ (Enhanced)

Generates SEO-optimized metadata.

**New Features (v5):**
- ✅ Intelligent JSON parsing
- ✅ Keyword extraction fallback
- ✅ Safe slug generation
- ✅ Full field validation

**Generates:**
- `slug` — URL-friendly identifier
- `meta_title` — SEO title (max 60 chars)
- `meta_description` — Meta description (max 155 chars)
- `keywords` — 5 relevant keywords

---

### 5. ImageAgent ✓ (Enhanced with Stable Diffusion XL)

Generates 3 high-quality images per article using **Stable Diffusion XL**.

**New Features (v5):**
- ✅ **Local SDXL** — Run Stable Diffusion XL on your GPU (fastest, best quality)
- ✅ **Stability AI API** — Cloud-based SDXL (no local GPU needed)
- ✅ **Multi-source fallback:**
  1. Try local SDXL (if available)
  2. Try Stability AI Cloud (if API key configured)
  3. Fall back to Unsplash (stock photos)
  4. Create placeholder as last resort
- ✅ **Exponential backoff** on rate limiting
- ✅ **Proper error handling**

**Setup Options:**

**Option 1: Local Stable Diffusion XL (Recommended for GPU)**

Install dependencies:
```bash
pip install torch torchvision diffusers transformers safetensors
```

Enable in `config/settings.py`:
```python
USE_LOCAL_SDXL = True  # Use local SDXL
```

First run will download the model (~7GB):
```bash
python run_agents.py --once
```

**Pros:** Fastest, best quality, no API costs, full privacy
**Cons:** Requires GPU (~8GB VRAM), large model download

**Option 2: Stability AI Cloud API**

1. Get free API key from [stability.ai](https://stability.ai)
2. Set environment variable:
   ```bash
   export STABILITY_API_KEY="sk-..."
   ```
3. Enable in `config/settings.py`:
   ```python
   USE_LOCAL_SDXL = False  # Use cloud API
   STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
   ```

**Pros:** No GPU needed, high quality, easy to use
**Cons:** Cloud-based, API quota limits, some cost after free tier

**Option 3: Unsplash (Free Fallback)**

Already configured, no setup needed. Used as automatic fallback.

**Image Output:**
Saves 3 images per article:
```
uploads/articles/{slug}/
  ├── img1.webp (1200×628 px)
  ├── img2.webp
  └── img3.webp
```

---

### 6. PublisherAgent ✓

Saves processed articles to database.

**Saves to tables:**
- `processed_articles` (main article data)
- `article_images` (3 images + alt text + captions)
- `article_tags` (keywords)
- `agent_logs` (audit trail)

---

## API Endpoints

### Health & Status

```bash
# Check system health
GET /health

Response:
{
  "api": "ok",
  "ollama": "ok",
  "model": "mistral:7b-instruct-q4_0",
  "models": ["mistral:7b-instruct-q4_0", ...]
}
```

### Text Processing

```bash
# Rewrite article text
POST /ai/rewrite
{
  "text": "Original article body",
  "title": "Optional title"
}

# Generate summary (2-3 sentences)
POST /ai/summary
{
  "text": "Article body"
}

# Generate SEO metadata
POST /ai/seo
{
  "title": "Article title",
  "text": "Article body"
}
```

### Image Generation

```bash
# Generate 3 images for article
POST /ai/generate-images
{
  "title": "Article title",
  "text": "Article body"
}

Response:
{
  "image_prompts": [...],
  "image1": "uploads/articles/.../img1.webp",
  "image2": "uploads/articles/.../img2.webp",
  "image3": "uploads/articles/.../img3.webp"
}
```

### Full Article Pipeline

```bash
# Process article through entire pipeline
POST /ai/generate-article
{
  "title": "Title",
  "text": "Article body"
}

# Or process from URL
POST /ai/process-url
{
  "url": "https://...",
  "title": "Optional override"
}
```

### Article Management

```bash
# Get published articles
GET /ai/articles?limit=20&status=published&category_id=1

# Get system memory/stats
GET /ai/memory

Response:
{
  "raw_articles_count": 1234,
  "processed_articles_count": 856,
  "total_logs": 15234
}

# Approve draft article (publish)
POST /ai/articles/{article_id}/approve
```

---

## Testing the System

### 1. Run Health Check

```bash
# Terminal 1: Start API
python run_agents.py --api

# Terminal 2: Run health check
python monitor.py
```

**Output:**
```
┌─ System Health Check
│ ✓ MySQL connected
│ ✓ Ollama OK (mistral:7b-instruct-q4_0)
│ ✓ Uploads dir OK (1234 files)
└──────────────────────────────────────────────────

┌─ Pipeline Statistics
│ Raw Articles: 5234
│ Pending: 45  ━  Processed: 4890  ━  Rejected: 299
│ Published Articles: 4890
│ Total Logs: 234567
└──────────────────────────────────────────────────
```

### 2. Run API Tests

```bash
# Start API first
python run_agents.py --api

# In another terminal:
python test_api.py
```

**Tests:**
- ✓ Health check
- ✓ Text rewriting
- ✓ Summarization
- ✓ SEO generation
- ✓ Image generation
- ✓ Full pipeline
- ✓ Article management

### 2. Run Single Pipeline Cycle

```bash
python run_agents.py --once
```

This:
1. Scrapes news sources
2. Processes 10 pending articles
3. Generates images for each (using SDXL)
4. Logs everything
5. Exits

---

## Monitoring

### View Recent Logs

```bash
python monitor.py --logs
```

Output:
```
┌─ Recent Logs (last 20)
│ [2026-03-16 10:23:45] MasterAgent     | pipeline_start: raw_id=1234
│ [2026-03-16 10:24:12] ExtractorAgent  | extracted: 3245 chars
│ [2026-03-16 10:24:55] EditorAgent     | rewritten: 3890 chars
│ [2026-03-16 10:25:23] SEOAgent        | metadata complete
│ [2026-03-16 10:26:12] ImageAgent      | images: 2 of 3 successful
│ [2026-03-16 10:26:45] PublisherAgent  | saved id=1234
└─────────────────────────────────────────────────────
```

### View Errors Only

```bash
python monitor.py --errors
```

---

## Error Handling & Retry Logic

### Automatic Retries

All LLM calls and image generation have automatic retry logic:

```
Attempt 1   ─→ [Error]
  ↓ (wait 1s)
Attempt 2   ─→ [Error]
  ↓ (wait 2s)
Attempt 3   ─→ [Error]
  ↓
[Fallback or skip]
```

**Backoff strategy:** Each retry waits 2× longer than previous.

**Config:** (`config/settings.py`)
```python
MAX_RETRIES      = 3      # Number of retry attempts
LOOP_INTERVAL_SECONDS = 1800  # 30 minutes between cycles
```

### Per-Component Fallbacks

| Component | Failure | Fallback |
|-----------|---------|----------|
| **Rewrite** | LLM fails | Keep original text |
| **Summary** | LLM fails | Extract first 3 sentences |
| **Category** | LLM fails | Keyword-based classification |
| **SEO** | LLM fails | Rule-based slug + keyword extraction |
| **Image** | All APIs fail | Create placeholder image |

---

## Performance & Scalability

### Current Performance

- **Scrape time:** ~10-15 seconds (RSS + HTML)
- **Processing per article:** ~30-45 seconds
- **Throughput:** 10-15 articles per 30-minute cycle
- **Memory:** ~500MB (Python + LLM client)
- **CPU:** ~20-30% during processing

### Optimization Tips

1. **Reduce LLM timeout** (if LLM is fast):
   ```python
   OLLAMA_TIMEOUT = 60  # Down from 180
   ```

2. **Batch more articles:**
   ```python
   # In master_agent.py, change LIMIT:
   cur.execute("... LIMIT 20")  # was 10
   ```

3. **Increase loop interval** (less frequent scraping):
   ```python
   LOOP_INTERVAL_SECONDS = 3600  # 60 minutes instead of 30
   ```

---

## Database Schema

### key tables

```sql
-- Raw articles from scrapers
raw_articles
  - id, title, url (UNIQUE), source_id, status, created_at

-- Processed articles (final content)
processed_articles
  - id, title, summary, content, category_id, slug, 
    status, meta_title, meta_description, created_at

-- Article images (3 per article)
article_images
  - id, article_id, image_url, alt_text, caption, position

-- Audit log (every action)
agent_logs
  - id, agent_name, message, article_id, created_at

-- Other tables
sources, categories, tags, article_tags
```

---

## Troubleshooting

### "429 Too Many Requests" (Image Generation)

**Cause:** Hitting API rate limits (usually from Stability API or Unsplash).

**Solution:** The system automatically falls back through multiple sources:
1. Tries local SDXL (no rate limits)
2. Tries Stability API
3. Falls back to Unsplash
4. Creates placeholder

**If still seeing failures:**
- Use local SDXL instead (Option 1 above)
- Or space out requests (increase `LOOP_INTERVAL_SECONDS`)

### Local SDXL Not Generating Images

**Cause:** GPU out of memory or model not downloaded.

**Fix:**
```bash
# Check CUDA availability
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"

# Free GPU memory (if using other apps)
# Then retry:
python run_agents.py --once

# If model fails to download, try manually:
python -c "from diffusers import StableDiffusionXLPipeline; StableDiffusionXLPipeline.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0')"
```

### Stability API Errors

**Cause:** Wrong API key or no credits left.

**Fix:**
```bash
# Test API key
curl -H "Authorization: Bearer YOUR_KEY" \
     https://api.stability.ai/v1/engines/list

# If 401: Key is invalid
# If 402: No credits left
```

### "Connection refused" (Ollama)

**Cause:** Ollama service not running.

**Fix:**
```bash
# Check if running:
curl http://localhost:11434/api/tags

# If not, start it:
ollama serve  # or use Docker
```

### Database Connection Issues

**Cause:** Wrong MySQL credentials or server down.

**Fix:**
```bash
# Test connection:
python test_api.py --endpoint health

# Check env vars:
echo $MYSQL_HOST $MYSQL_USER $MYSQL_DB

# Or test directly:
mysql -h localhost -u nashik -p nashik_headlines
```

### Articles Not Saving

**Cause:** Usually duplicate URL or missing fields.

**Debug:**
```bash
# Check recent errors:
python monitor.py --errors

# Check pending articles:
mysql> SELECT id, title, url, status FROM raw_articles 
       WHERE status='pending' 
       LIMIT 10;
```

---

## Next Steps / Advanced Usage

### 1. Custom RSS Feeds

Edit `config/settings.py`:
```python
RSS_FEEDS = [
    "https://your-feed-here.xml",
    "https://another-feed.xml",
]
```

### 2. Custom Categories

Edit `config/settings.py`:
```python
CATEGORIES = {
    1: "crime",
    2: "politics",
    # ... add yours
}
```

Update keyword rules in `tools/classify_category.py`:
```python
_KEYWORD_RULES = {
    "your_category": ["keyword1", "keyword2", ...],
}
```

### 4. Configure Image Generation

Edit `config/settings.py`:

**Option A: Local Stable Diffusion XL (GPU)**
```python
USE_LOCAL_SDXL = True
# First run will download ~7GB model
# Requires: pip install torch diffusers transformers
```

**Option B: Stability AI Cloud API**
```python
USE_LOCAL_SDXL = False
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "sk-your-key")

# Get free key at: https://stability.ai
# Then: export STABILITY_API_KEY="sk-..."
```

**Fallback chain:**
1. Local SDXL (if available)
2. Stability API (if key configured)
3. Unsplash (free, always works)
4. Placeholder (last resort)

### 5. Integration with Admin Panel

The Admin Panel at `Admin_panel/` connects via:
```
http://localhost:8002/ai/...
```

To serve everything together:
```bash
# Terminal 1: API
cd manus_agents && python run_agents.py --api --loop

# Terminal 2: Frontend
cd Admin_panel/frontend && npm run dev
```

### 4. Email Notifications (Optional)

Add to `master_agent/agent.py`:
```python
if saved > 0:
    send_email_notification(f"{saved} articles processed")
```

---

## Version History

| Version | Features | Date |
|---------|----------|------|
| v5.0 | Retry logic, multi-source images, keyword fallback, full logging | 2026-03-16 |
| v4.5 | ImageAgent, category classification | 2026-03-01 |
| v4.0 | SEO metadata, slug generation | 2026-02-15 |
| v3.0 | Initial agents, basic CRUD | 2026-01-30 |

---

## Support & Logs

- **System logs:** Check `agent_logs` table in MySQL
- **API logs:** Check console output when running `python run_agents.py --api`
- **Monitor script:** `python monitor.py --logs`
- **Health check:** `python monitor.py`

---

## License & Credits

**Manus Agents** — AI-powered newsroom for Nashik Headlines.

Powered by:
- **Ollama** — Local LLM inference
- **MySQL** — Data persistence
- **FastAPI** — API framework
- **pollinations.ai** — Image generation
- **Unsplash** — Stock photos (fallback)

---

**System Status: 95% Production Ready** ✅

Next release (v5.1): Email notifications, webhooks, duplicate prevention improvements.
