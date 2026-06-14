/**
 * routes/seo.js
 *
 * POST /api/seo/optimize  — Run unified AI pipeline on an article payload
 * POST /api/seo/score     — Calculate Yoast-style SEO score (no AI)
 * GET  /api/seo/related-articles — Internal linking suggestions
 */

const express   = require("express");
const router    = express.Router();
const { processAllInOne }    = require("../services/aiPipeline/unifiedAgent");
const { renderArticleHtml }  = require("../services/content/htmlRenderer");
const { calculateSeoScore }  = require("../services/seo");
const db                     = require("../db");

// ── POST /api/seo/optimize ────────────────────────────────────────────────────
// Single Groq call → structured JSON → rendered HTML + SEO fields
router.post("/seo/optimize", async (req, res) => {
  const article = req.body;

  if (!article || (!article.content && !article.title)) {
    return res.status(400).json({ error: "article.content or article.title is required" });
  }

  try {
    console.log(`[SEO Optimize] Starting for article: "${(article.title || "").slice(0, 60)}"`);

    // Single AI call → structured JSON
    const articleJson = await processAllInOne(
      article.title || "",
      article.content || "",
      { language: article.language, publish_to: article.publish_to }
    );

    // Render HTML from structured JSON
    const renderedContent = renderArticleHtml(articleJson);

    // Calculate SEO score (pure JS)
    const scoreInfo = calculateSeoScore({
      ...article,
      title:            articleJson.title,
      content:          renderedContent,
      seo_title:        articleJson.seo_title,
      meta_description: articleJson.meta_description,
      slug:             articleJson.slug,
      keywords:         articleJson.keywords,
      focus_keyword:    articleJson.focus_keyword,
    });

    res.json({
      success: true,
      optimized: {
        improved_content:       renderedContent,
        title:                  articleJson.title,
        seo_title:              articleJson.seo_title,
        focus_keyword:          articleJson.focus_keyword,
        meta_description:       articleJson.meta_description,
        slug:                   articleJson.slug,
        keywords:               articleJson.keywords,
        og_title:               articleJson.og_title || articleJson.seo_title,
        og_description:         articleJson.og_description || articleJson.meta_description,
        twitter_title:          articleJson.twitter_title || articleJson.og_title,
        twitter_description:    articleJson.twitter_description || articleJson.og_description,
        category:               articleJson.category,
        tags:                   articleJson.tags,
        excerpt:                articleJson.excerpt,
        featured_image_alt:     article.featured_image_alt || article.image_alt || article.title || "",
        featured_image_caption: article.featured_image_caption || "",
        seo_score:              scoreInfo.score,
        word_count:             scoreInfo.wordCount,
        seo_checks:             scoreInfo.checks,
      },
    });
  } catch (err) {
    console.error("[SEO Optimize] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/seo/score ───────────────────────────────────────────────────────
// Lightweight score calculation (no AI call) — used by the live editor panel.
router.post("/seo/score", (req, res) => {
  try {
    const article = req.body;
    const scoreInfo = calculateSeoScore({
      ...article,
      content: article.content || "",
    });
    res.json({ success: true, ...scoreInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/seo/related-articles ─────────────────────────────────────────────
// Returns 5 recent published articles for internal linking suggestions.
router.get("/seo/related-articles", async (req, res) => {
  const { category, limit = 5 } = req.query;
  try {
    let rows;
    if (category) {
      rows = await db.queryAsync(
        `SELECT id, title, slug, category FROM articles WHERE status = 'published' AND category ILIKE $1 ORDER BY published_at DESC LIMIT $2`,
        [`%${category}%`, parseInt(limit)]
      );
    } else {
      rows = await db.queryAsync(
        `SELECT id, title, slug, category FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT $1`,
        [parseInt(limit)]
      );
    }
    res.json({ success: true, articles: rows || [] });
  } catch (err) {
    // Fallback — db might use callback style
    res.json({ success: true, articles: [] });
  }
});

module.exports = router;
