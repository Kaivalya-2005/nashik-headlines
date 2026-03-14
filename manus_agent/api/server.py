"""
api/server.py
-------------
FastAPI REST API — exposes AI tools to the Nashik Headlines admin panel.

Endpoints:
  POST /ai/rewrite          → rewrite article text
  POST /ai/summary          → generate a summary
  POST /ai/seo              → generate SEO metadata
  POST /ai/process-url      → full pipeline on a URL
  GET  /ai/articles         → list recently processed articles
  GET  /ai/memory           → view agent memory snapshot
  GET  /health              → health check / Ollama connectivity
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from agent.controller import (
    process_article,
    run_single_rewrite,
    run_single_summary,
    run_single_seo,
)
from tools.database import fetch_articles
from memory.memory_manager import get_memory_snapshot
from config.model_config import OLLAMA_BASE_URL, OLLAMA_MODEL


# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Mini-Manus Agent API",
    description="Local agentic AI for Nashik Headlines newsroom",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your admin panel origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schemas ────────────────────────────────────────────────────────────
class TextRequest(BaseModel):
    text: str
    title: str = ""


class UrlRequest(BaseModel):
    url: str
    title: str = ""
    source: str = "manual"


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Check API and Ollama connectivity."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        ollama_status = "ok" if resp.ok else "unreachable"
        models = [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        ollama_status = "unreachable"
        models = []

    return {
        "api": "ok",
        "ollama": ollama_status,
        "model": OLLAMA_MODEL,
        "available_models": models,
    }


@app.post("/ai/rewrite")
def rewrite(req: TextRequest):
    """Rewrite an article using the local LLM."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text field is required")
    result = run_single_rewrite(req.text)
    return {"rewritten": result}


@app.post("/ai/summary")
def summary(req: TextRequest):
    """Generate a concise summary for the given article text."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text field is required")
    result = run_single_summary(req.text)
    return {"summary": result}


@app.post("/ai/seo")
def seo(req: TextRequest):
    """Generate SEO title, meta description, and keywords."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text field is required")
    result = run_single_seo(req.text, title=req.title)
    return result


@app.post("/ai/process-url")
def process_url(req: UrlRequest):
    """Run the full agent pipeline on a news URL."""
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="url field is required")
    stub = {"url": req.url, "title": req.title, "source": req.source}
    result = process_article(stub)
    return {
        "db_id":            result.get("db_id"),
        "title":            result.get("title"),
        "seo_title":        result.get("seo_title"),
        "category":         result.get("category"),
        "summary":          result.get("summary"),
        "meta_description": result.get("meta_description"),
        "keywords":         result.get("keywords"),
    }


@app.get("/ai/articles")
def list_articles(limit: int = 20, category: str | None = None):
    """Return recently processed articles."""
    articles = fetch_articles(limit=limit, category=category)
    return {"count": len(articles), "articles": articles}


@app.get("/ai/memory")
def memory_snapshot():
    """Return the current agent memory state."""
    return get_memory_snapshot()
