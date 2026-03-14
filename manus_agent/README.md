# Mini-Manus Agent — Nashik Headlines AI System

A local, zero-API-cost agentic AI system that autonomously scrapes, rewrites, summarises, categorises, and stores news articles for Nashik Headlines.

---

## Quick Start

```bash
# 1. Create and activate the virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Make sure Ollama is running with your model
ollama serve &
ollama pull llama3

# 4. Run
python run_agent.py              # continuous loop (every 30 min)
python run_agent.py --once       # single scrape-process cycle
python run_agent.py --api        # admin API only (port 8001)
python run_agent.py --api --loop # API + automation loop together
```

---

## Project Structure

```
manus_agent/
│
├── run_agent.py              ← Entry point (CLI)
├── requirements.txt
│
├── config/
│   └── model_config.py       ← Model, sources, categories, DB path
│
├── memory/
│   ├── agent_memory.json     ← Persistent memory store
│   └── memory_manager.py     ← Read/write memory (dedup, logs)
│
├── tools/                    ← Agent tools (callable by the controller)
│   ├── scraper.py            ← Scrape news sources for article links
│   ├── extractor.py          ← Extract clean body text (newspaper3k + BS4)
│   ├── rewriter.py           ← LLM rewrite in Nashik Headlines style
│   ├── summarizer.py         ← LLM 2-3 sentence summary
│   ├── categorizer.py        ← LLM category classification
│   ├── seo.py                ← LLM SEO title / meta / keywords (JSON)
│   └── database.py           ← SQLite persistence + fetch
│
├── agent/
│   ├── planner.py            ← LLM generates dynamic tool-step plan
│   └── controller.py         ← Executes plan, orchestrates all tools
│
└── api/
    └── server.py             ← FastAPI admin REST API (port 8001)
```

---

## Admin API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Check API + Ollama status |
| POST | `/ai/rewrite` | Rewrite article text |
| POST | `/ai/summary` | Generate article summary |
| POST | `/ai/seo` | Generate SEO metadata |
| POST | `/ai/process-url` | Full pipeline on a news URL |
| GET | `/ai/articles` | List processed articles |
| GET | `/ai/memory` | View agent memory |

Interactive docs: `http://localhost:8001/docs`

---

## Switching the LLM

Edit `config/model_config.py`:

```python
OLLAMA_MODEL = "llama3"    # or "mistral", "deepseek-r1", etc.
```

---

## Adding News Sources

```python
NEWS_SOURCES = [
    "https://timesofindia.indiatimes.com/city/nashik",
    "https://your-new-source.com/nashik",
]
```
