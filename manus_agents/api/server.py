"""
api/server.py
FastAPI admin API for Nashik Headlines — powered by MasterAgent.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests
import time
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

class ProcessTextRequest(BaseModel):
    content: str
    title: str = ""

class ToggleRequest(BaseModel):
    enabled: bool

class RunRequest(BaseModel):
    limit: int = 10
    include_scraper: bool | None = None


def _ai_payload(article: dict) -> dict:
    return {
        "db_id": article.get("db_id"),
        "url": article.get("url"),
        "source_id": article.get("source_id"),
        "title": article.get("title"),
        "body": article.get("body"),
        "rewritten_body": article.get("rewritten_body"),
        "summary": article.get("summary"),
        "category": article.get("category"),
        "slug": article.get("slug"),
        "meta_title": article.get("meta_title"),
        "meta_description": article.get("meta_description"),
        "keywords": article.get("keywords"),
        "status": article.get("status"),
        "created_at": article.get("created_at"),
        "image1": article.get("image1"),
        "image2": article.get("image2"),
        "image3": article.get("image3"),
        "ai_outputs": {
            "rewrite": article.get("rewritten_body"),
            "summary": article.get("summary"),
            "seo": {
                "slug": article.get("slug"),
                "meta_title": article.get("meta_title"),
                "meta_description": article.get("meta_description"),
                "keywords": article.get("keywords"),
            },
        },
    }


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


@app.get("/ai/status")
def api_status():
    start = time.perf_counter()
    status = "unreachable"
    gpu = False

    try:
        tags_resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if tags_resp.ok:
            models = [m.get("name", "") for m in tags_resp.json().get("models", [])]
            model_available = any(m == OLLAMA_MODEL or m.startswith(f"{OLLAMA_MODEL}:") for m in models)
            status = "running" if model_available else "model_not_found"

            try:
                ps_resp = requests.get(f"{OLLAMA_BASE_URL}/api/ps", timeout=5)
                if ps_resp.ok:
                    for item in ps_resp.json().get("models", []):
                        name = item.get("name", "")
                        if name == OLLAMA_MODEL or name.startswith(f"{OLLAMA_MODEL}:"):
                            gpu = bool(item.get("size_vram", 0) and int(item.get("size_vram", 0)) > 0)
                            break
            except Exception:
                pass

            return {
                "model": OLLAMA_MODEL,
                "status": status,
                "gpu": gpu,
                "response_time_ms": elapsed_ms,
            }
    except Exception:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "model": OLLAMA_MODEL,
            "status": "unreachable",
            "gpu": False,
            "response_time_ms": elapsed_ms,
        }

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return {
        "model": OLLAMA_MODEL,
        "status": status,
        "gpu": gpu,
        "response_time_ms": elapsed_ms,
    }


@app.get("/admin/runtime")
def api_runtime_config():
    return _master.get_runtime_config()


@app.post("/admin/runtime/web-scraper")
def api_toggle_web_scraper(req: ToggleRequest):
    _master.set_web_scraper_enabled(req.enabled)
    return {
        "success": True,
        "web_scraper_enabled": _master.get_runtime_config().get("web_scraper_enabled", True),
    }


@app.post("/admin/actions/run-scraper")
def api_run_scraper():
    inserted = _master.run_scraper()
    return {"success": True, "inserted": inserted}


@app.post("/admin/actions/run-pending")
def api_run_pending(req: RunRequest):
    limit = max(1, min(req.limit, 100))
    result = _master.process_pending(limit=limit)
    return {"success": True, **result}


@app.post("/admin/actions/run-cycle")
def api_run_cycle(req: RunRequest):
    limit = max(1, min(req.limit, 100))
    saved = _master.run(include_scraper=req.include_scraper, limit=limit)
    return {
        "success": True,
        "saved": saved,
        "limit": limit,
        "include_scraper": req.include_scraper,
    }


@app.get("/admin/stats")
def api_stats():
    return _master.get_stats()


@app.get("/admin/queue")
def api_queue(limit: int = 20):
    safe_limit = max(1, min(limit, 100))
    queue = _master.get_queue(limit=safe_limit)
    return {
        "limit": safe_limit,
        **queue,
    }


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

        return _ai_payload(article)
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")


@app.post("/ai/process-text")
def api_process_text(req: ProcessTextRequest):
    if not req.content.strip():
        raise HTTPException(400, "content required")

    stub = {
        "url": f"manual-{uuid4().hex[:8]}",
        "title": req.title or req.content[:60],
        "source_id": None,
        "body": req.content,
    }
    try:
        from editor_agent.agent import EditorAgent
        from seo_agent.agent import SEOAgent
        from publisher_agent.agent import PublisherAgent

        article = EditorAgent().run(stub)
        article = SEOAgent().run(article)
        article = PublisherAgent().run(article)
        return _ai_payload(article)
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
    return _ai_payload(result)


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
