"""
api/server.py
FastAPI admin API for Nashik Headlines — powered by MasterAgent.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools.rewrite_article       import rewrite_article
from tools.generate_summary      import generate_summary
from tools.generate_seo_metadata import generate_seo_metadata
# from tools.generate_image_prompts import generate_image_prompts  # IMAGE GENERATION DISABLED
# from tools.generate_images       import generate_images  # IMAGE GENERATION DISABLED
from tools.store_article         import fetch_articles, update_article_status
from master_agent.agent          import MasterAgent
from memory.store                import get_snapshot
from config.settings             import OLLAMA_BASE_URL, OLLAMA_MODEL

app = FastAPI(
    title="Manus Agents — Admin API",
    description="Local multi-agent AI backend for Nashik Headlines (9-table MySQL integration)",
    version="5.0.0",
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
    source_id: int | None = None


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


# ── Admin AI Functions ─────────────────────────────────────────────────────────

@app.post("/ai/rewrite")
def api_rewrite(req: TextRequest):
    if not req.text.strip(): raise HTTPException(400, "text required")
    dummy = {"url": "api", "title": req.title, "source_id": None, "body": req.text}
    result = rewrite_article(dummy)
    return {"rewritten": result.get("rewritten_body", "")}


@app.post("/ai/generate-article")
def api_generate_article(req: TextRequest):
    if not req.text.strip(): raise HTTPException(400, "Topic required")
    stub = {
        "url": f"admin-generated-{uuid4().hex[:8]}",
        "title": req.title or req.text[:60],
        "source_id": None,
        "body": req.text,
    }
    try:
        from editor_agent.agent import EditorAgent
        from seo_agent.agent import SEOAgent
        from image_agent.agent import ImageAgent
        from publisher_agent.agent import PublisherAgent

        article = EditorAgent().run(stub)
        article = SEOAgent().run(article)
        # article = ImageAgent().run(article)  # IMAGE GENERATION DISABLED
        article = PublisherAgent().run(article)

        return {k: article.get(k) for k in
                ("db_id", "title", "rewritten_body", "summary", "category",
                 "slug", "meta_title", "meta_description", "keywords",
                 "image1", "image2", "image3")}
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")


@app.post("/ai/summary")
def api_summary(req: TextRequest):
    if not req.text.strip(): raise HTTPException(400, "text required")
    dummy = {"url": "api", "body": req.text, "rewritten_body": req.text}
    result = generate_summary(dummy)
    return {"summary": result.get("summary", "")}


@app.post("/ai/seo")
def api_seo(req: TextRequest):
    if not req.text.strip(): raise HTTPException(400, "text required")
    dummy = {"url": "api", "title": req.title, "body": req.text, "rewritten_body": req.text}
    result = generate_seo_metadata(dummy)
    return {k: result.get(k) for k in ("slug", "meta_title", "meta_description", "keywords")}


# @app.post("/ai/generate-images")  # IMAGE GENERATION DISABLED
# def api_generate_images(req: TextRequest):
#     if not req.text.strip(): raise HTTPException(400, "text required")
#     dummy = {
#         "title": req.title or req.text[:60],
#         "body": req.text,
#         "rewritten_body": req.text,
#         "slug": f"admin-img-{uuid4().hex[:8]}",
#     }
#     dummy = generate_image_prompts(dummy)
#     dummy = generate_images(dummy)
#     return {"image_prompts": dummy.get("image_prompts", []),
#             "image1": dummy.get("image1"), "image2": dummy.get("image2"), "image3": dummy.get("image3")}


@app.post("/ai/process-url")
def api_process_url(req: UrlRequest):
    if not req.url.strip(): raise HTTPException(400, "url required")
    stub = {"url": req.url, "title": req.title, "source_id": req.source_id}
    result = _master.process(stub)
    return {k: result.get(k) for k in
            ("db_id", "title", "summary", "category",
             "slug", "meta_title", "meta_description", "keywords",
             "image1", "image2", "image3")}


# ── Article Management ─────────────────────────────────────────────────────────

@app.get("/ai/articles")
def api_articles(limit: int = 20, category_id: int | None = None, status: str | None = None):
    arts = fetch_articles(limit=limit, category_id=category_id, status=status)
    return {"count": len(arts), "articles": arts}


@app.post("/ai/articles/{article_id}/approve")
def api_approve_article(article_id: int):
    success = update_article_status(article_id, "published")
    if not success:
        raise HTTPException(404, "Article not found")
    return {"success": True, "message": f"Article {article_id} approved and published."}


@app.get("/ai/memory")
def api_memory():
    return get_snapshot()
