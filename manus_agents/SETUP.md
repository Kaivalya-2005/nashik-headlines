# Setup Instructions for manus_agents

## Prerequisites
- Python 3.10+
- MySQL 5.7+
- Ollama (for local LLM)

## Installation Steps

### 1. Create Virtual Environment
```bash
cd /home/kaivalya/Desktop/nashik-headlines/manus_agents

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/macOS
# or
.\.venv\Scripts\activate  # Windows
```

### 2. Install Dependencies
```bash
# Core dependencies
pip install -r requirements.txt

# Optional: For local Stable Diffusion XL image generation
# pip install torch diffusers transformers safetensors accelerate
# (Note: Requires GPU for optimal performance)
```

### 3. Configure Environment

Create or update `.env` file with your API keys:
```bash
# Required
MYSQL_HOST=localhost
MYSQL_USER=nashik
MYSQL_PASSWORD=nashik123
MYSQL_DB=nashik_headlines
MYSQL_PORT=3306

# Optional but recommended
STABILITY_API_KEY=your-key-here     # Get from https://stability.ai
UNSPLASH_ACCESS_KEY=your-key-here   # Get from https://unsplash.com/oauth
UNSPLASH_SECRET_KEY=your-key-here   # (Optional)
```

**Important:** Never commit `.env` files with real API keys. Keep them private!

### 4. Initialize Database
```bash
python3 tools/init_db.py
```

This will:
- Create all 9 MySQL tables
- Set up proper foreign keys
- Seed categories and sources

### 5. Start Ollama (in a separate terminal)
```bash
ollama serve

# In another terminal, pull the model:
ollama pull mistral:7b-instruct-q4_0
```

### 6. Verify System Health
```bash
python3 monitor.py
```

You should see:
- ✓ MySQL connected
- ✓ Ollama OK
- ✓ Uploads dir OK

## Running the System

### Single Cycle (Test)
```bash
python3 run_agents.py --once
```

### Continuous Loop (Every 30 min)
```bash
python3 run_agents.py --loop
```

### Admin API (Port 8002)
```bash
python3 run_agents.py --api
```

### API + Loop (Concurrent)
```bash
python3 run_agents.py --api --loop
```

### Health Check
```bash
curl http://localhost:8002/health
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'mysql'"
- Ensure virtual environment is activated: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### "Connection refused" (Ollama)
- Start Ollama: `ollama serve`
- Verify model: `ollama list`
- Pull if missing: `ollama pull mistral:7b-instruct-q4_0`

### "MySQL connection failed"
- Check credentials in `.env`
- Verify MySQL is running: `mysql -u nashik -p nashik_headlines`
- Run init: `python3 tools/init_db.py`

### Image generation failing
- The system has 4-level fallback:
  1. Local Stable Diffusion XL (if torch installed)
  2. Stability AI Cloud API (requires API key)
  3. Unsplash Stock Photos (fallback)
  4. Placeholder (last resort)

### "429 Too Many Requests"
- Space out scrape intervals: Edit `LOOP_INTERVAL_SECONDS` in `config/settings.py`
- Or use local SDXL: `SETUP_LOCAL_SDXL=yes python3 setup_sdxl.py`

## Monitoring & Logs

### View System Logs
```bash
python3 monitor.py --logs
```

### View Errors Only
```bash
python3 monitor.py --errors
```

### View Statistics
```bash
python3 monitor.py --stats
```

### Database Query
```bash
# Check pending articles
mysql -u nashik -p nashik_headlines
mysql> SELECT id, title, url, status FROM raw_articles WHERE status='pending' LIMIT 10;
```

## Project Structure

```
manus_agents/
├── master_agent/        # Orchestrator
├── scraper_agent/       # Fetch articles
├── extractor_agent/     # Parse content
├── editor_agent/        # Rewrite + categorize
├── seo_agent/          # Generate metadata
├── image_agent/        # Generate/fetch images
├── publisher_agent/    # Save to MySQL
├── tools/              # Shared utilities
├── config/             # Settings & environment
├── memory/             # Logging & state
├── api/                # FastAPI endpoints
├── run_agents.py       # Main entry point
└── monitor.py          # Health check
```

## Optional: Local Stable Diffusion XL

For offline image generation (no API costs):

```bash
# 1. Install optional dependencies
pip install torch diffusers transformers safetensors accelerate

# 2. Enable in config/settings.py
USE_LOCAL_SDXL = True

# 3. First run downloads the model (~7GB)
python3 run_agents.py --once
```

**Requirements:**
- NVIDIA GPU (6GB+ VRAM recommended)
- CUDA installed
- 10-15GB free disk space

## Support

- Check logs: `python3 monitor.py --errors`
- Run health check: `curl http://localhost:8002/health`
- Review database: `mysql nashik_headlines`
- Check configs: `cat config/settings.py`

---

**Last Updated:** March 16, 2026
**Version:** 5.0.0
