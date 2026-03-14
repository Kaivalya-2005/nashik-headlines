"""
api/server.py
FastAPI admin API for Nashik Headlines — powered by MasterAgent.

Endpoints:
  GET  /health
  POST /ai/rewrite
  POST /ai/summary
  POST /ai/seo
  POST /ai/process-url
  GET  /ai/articles
  GET  /ai/memory
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools.rewrite_article       import rewrite_article
from tools.generate_summary      import generate_summary
from tools.generate_seo_metadata import generate_seo_metadata
from tools.store_article         import fetch_articles
from master_agent.agent          import MasterAgent
from memory.store                import get_snapshot
from config.settings             import OLLAMA_BASE_URL, OLLAMA_MODEL, API_HOST, API_PORT

app = FastAPI(
    title="Manus Agents — Admin API",
    description="Local multi-agent AI backend for Nashik Headlines",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_master = MasterAgent()


# ── schemas ────────────────────────────────────────────────────────────────────
class TextRequest(BaseModel):
    text: str
    title: str = ""

class UrlRequest(BaseModel):
    url: str
    title: str = ""
    source: str = "manual"


# ── endpoints ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        ollama = "ok" if r.ok else "unreachable"
        models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        ollama, models = "unreachable", []
    return {"api": "ok", "ollama": ollama, "model": OLLAMA_MODEL, "models": models}


@app.post("/ai/rewrite")
def api_rewrite(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(400, "text required")
    dummy = {"url": "api", "title": req.title, "source": "api", "body": req.text}
    result = rewrite_article(dummy)
    return {"rewritten": result.get("rewritten_body", "")}


@app.post("/ai/summary")
def api_summary(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(400, "text required")
    dummy = {"url": "api", "title": req.title, "source": "api",
             "body": req.text, "rewritten_body": req.text}
    result = generate_summary(dummy)
    return {"summary": result.get("summary", "")}


@app.post("/ai/seo")
def api_seo(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(400, "text required")
    dummy = {"url": "api", "title": req.title, "source": "api",
             "body": req.text, "rewritten_body": req.text}
    result = generate_seo_metadata(dummy)
    return {k: result.get(k) for k in ("slug", "meta_title", "meta_description", "keywords")}


@app.post("/ai/process-url")
def api_process_url(req: UrlRequest):
    if not req.url.strip():
        raise HTTPException(400, "url required")
    stub = {"url": req.url, "title": req.title, "source": req.source}
    result = _master.process(stub)
    return {k: result.get(k) for k in
            ("db_id", "title", "headline", "category", "summary",
             "slug", "meta_title", "meta_description", "keywords",
             "image_prompt", "image_url")}


@app.get("/ai/articles")
def api_articles(limit: int = 20, category: str | None = None, status: str | None = None):
    arts = fetch_articles(limit=limit, category=category, status=status)
    return {"count": len(arts), "articles": arts}


@app.get("/ai/memory")
def api_memory():
    return get_snapshot()
