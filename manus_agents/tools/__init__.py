"""tools package — convenience imports"""
from .scrape_news           import scrape_news
from .extract_article       import extract_article
from .rewrite_article       import rewrite_article
from .generate_summary      import generate_summary
from .classify_category     import classify_category
from .generate_seo_metadata import generate_seo_metadata
from .generate_image_prompt import generate_image_prompt
from .store_article         import store_article, fetch_articles

__all__ = [
    "scrape_news", "extract_article", "rewrite_article",
    "generate_summary", "classify_category", "generate_seo_metadata",
    "generate_image_prompt", "store_article", "fetch_articles",
]
