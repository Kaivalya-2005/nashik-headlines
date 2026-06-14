/**
 * pipelineService.js
 *
 * Orchestrates the AI article processing pipeline:
 *
 *  Step 1 → cleanAgent    : strip HTML/ads/whitespace, detect language
 *  Step 2 → unifiedAgent  : single Groq call → structured JSON
 *  Step 3 → qualityAgent  : fast pure JS checks (readability, repetition, length)
 *  Step 4 → imageAgent    : generate featured image
 *  Step 5 → htmlRenderer  : build clean HTML from structured JSON
 *
 * Returns the final processed article object ready for DB insertion.
 */

const db = require("../../db");
const { clean }            = require("./cleanAgent");
const { processAllInOne }  = require("./unifiedAgent");
const { checkQuality }     = require("./qualityAgent");
const { generateImage }    = require("./imageAgent");
const { renderArticleHtml, countWords, isMarathiText } = require("../content/htmlRenderer");

// ── Quality Thresholds ────────────────────────────────────────────────────────
const QUALITY_THRESHOLD   = 50;
const READABILITY_MINIMUM = 40;
const MIN_WORD_COUNT      = 20;

// ── DB Logging Helper ─────────────────────────────────────────────────────────
function log(step, message, status = "info") {
  const truncated = String(message).slice(0, 2000);
  db.query(
    "INSERT INTO logs (step, message, status) VALUES (?, ?, ?)",
    [step, truncated, status],
    (err) => { if (err) console.error("⚠️  Failed to write log:", err.message); }
  );
  const icon = status === "error" ? "❌" : status === "warning" ? "⚠️ " : "✅";
  console.log(`${icon} [${step}] ${message}`);
}

// ── Pipeline Orchestrator ─────────────────────────────────────────────────────

async function runPipeline(rawArticle) {
  const articleId = rawArticle.id;
  log("pipeline", `▶ Starting pipeline for raw_article #${articleId}: "${rawArticle.title?.slice(0, 60)}"`);

  // ── STEP 1: CLEAN ───────────────────────────────────────────────────────
  log("clean", `Cleaning raw article #${articleId}`);
  let cleaned;
  try {
    cleaned = clean(rawArticle);
    log("clean", `Done — ${cleaned.word_count} words, language: ${cleaned.language}`);
  } catch (err) {
    log("clean", `Failed: ${err.message}`, "error");
    throw new Error(`cleanAgent failed: ${err.message}`);
  }

  const { clean_title, clean_content, language } = cleaned;

  if (clean_content.split(/\s+/).filter(Boolean).length < 10) {
    log("clean", "Content too short after cleaning — article skipped", "warning");
    throw new Error("Article content too short to process");
  }

  // ── STEP 2: UNIFIED AI AGENT → STRUCTURED JSON ─────────────────────────
  log("unified_agent", `Generating structured JSON via single Groq call for #${articleId}`);
  let articleJson;
  try {
    articleJson = await processAllInOne(clean_title, clean_content, {
      language,
      publish_to: rawArticle.publish_to,
    });
    log("unified_agent", `Done — ${articleJson.sections?.length} sections, category: ${articleJson.category}, kw: "${articleJson.focus_keyword}"`);
  } catch (err) {
    log("unified_agent", `Failed: ${err.message}`, "error");
    throw new Error(`unifiedAgent failed: ${err.message}`);
  }

  // ── STEP 3: QUALITY CHECK (pure JS, no AI call) ────────────────────────
  // Build temporary plain text for quality checks
  const plainText = [
    articleJson.intro,
    ...articleJson.sections.flatMap(s => s.paragraphs),
    articleJson.conclusion,
  ].filter(Boolean).join("\n\n");

  log("quality_check", `Running quality validation for #${articleId}`);
  let quality;
  try {
    quality = await checkQuality(articleJson.title, plainText);
    quality.ai_confidence = articleJson.ai_confidence || 75;
    log("quality_check", `Done — readability:${quality.readability_score} ai_confidence:${quality.ai_confidence} words:${quality.content_length}`);
  } catch (err) {
    log("quality_check", `Failed: ${err.message}`, "error");
    quality = { readability_score: 50, ai_confidence: articleJson.ai_confidence || 75, content_length: 0, warnings: [] };
  }

  // ── Threshold enforcement ──────────────────────────────────────────────
  if (quality.ai_confidence < QUALITY_THRESHOLD) {
    const msg = `Quality gate failed: ai_confidence ${quality.ai_confidence} < ${QUALITY_THRESHOLD}`;
    log("quality_fail", msg, "error");
    const err = new Error(msg);
    err.qualityFail = true;
    err.qualityMetrics = quality;
    throw err;
  }

  if (quality.content_length < MIN_WORD_COUNT) {
    const msg = `Quality gate failed: content too short (${quality.content_length} words)`;
    log("quality_fail", msg, "error");
    const err = new Error(msg);
    err.qualityFail = true;
    err.qualityMetrics = quality;
    throw err;
  }

  const needsReview = quality.readability_score < READABILITY_MINIMUM;
  if (needsReview) {
    log("quality_check", `Low readability (${quality.readability_score}) — flagged for review`, "warning");
  }

  // ── STEP 4: IMAGE GENERATION ───────────────────────────────────────────
  log("image_agent", `Generating featured image for #${articleId}`);
  let image_url = "";
  try {
    image_url = await generateImage(articleJson.title, articleJson.keywords || articleJson.category);
    log("image_agent", `Done — Image generated`);
  } catch (err) {
    log("image_agent", `Skipped: ${err.message}`, "warning");
  }

  // ── STEP 5: RENDER HTML FROM STRUCTURED JSON ───────────────────────────
  const isMarathi = language === "mr" || isMarathiText(articleJson.title);
  const renderedContent = renderArticleHtml(articleJson, [], {
    siteUrl:   isMarathi ? "navimumbaiheadlines.com" : "nashikheadlines.com",
    sourceUrl: rawArticle.source_url || (isMarathi ? "https://maharashtra.gov.in" : "https://pib.gov.in"),
    isMarathi,
  });

  log("render", `HTML rendered — ${countWords(renderedContent)} words`);

  // ── ASSEMBLE FINAL ARTICLE ─────────────────────────────────────────────
  const seoScore = articleJson.seo_score || Math.round(
    (articleJson.focus_keyword ? 20 : 0) +
    (articleJson.meta_description ? 20 : 0) +
    (articleJson.seo_title ? 15 : 0) +
    (articleJson.sections?.length >= 3 ? 15 : 5) +
    (countWords(renderedContent) >= 300 ? 15 : 5) +
    (articleJson.slug ? 15 : 0)
  );

  const quality_score = Math.round(
    quality.ai_confidence * 0.50 +
    quality.readability_score * 0.30 +
    seoScore * 0.20
  );

  const processedArticle = {
    title:             articleJson.title,
    content:           renderedContent,
    summary:           (articleJson.excerpt || articleJson.intro || "").slice(0, 250).trim(),
    category:          articleJson.category || "Local News",
    seo_title:         articleJson.seo_title || articleJson.title,
    meta_description:  articleJson.meta_description || "",
    keywords:          articleJson.keywords || "",
    slug:              articleJson.slug || articleJson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    focus_keyword:     articleJson.focus_keyword || "",
    image_url,
    seo_score:         seoScore,
    quality_score,
    readability_score: quality.readability_score,
    ai_confidence:     quality.ai_confidence,
    quality_warnings:  quality.warnings,
    needs_review:      needsReview,
    language,
    source:            rawArticle.source || null,
    raw_article_id:    articleId,
    status:            "draft",
    // Social/SEO fields from AI
    og_title:            articleJson.og_title || articleJson.seo_title || "",
    og_description:      articleJson.og_description || articleJson.meta_description || "",
    twitter_title:       articleJson.twitter_title || articleJson.og_title || "",
    twitter_description: articleJson.twitter_description || articleJson.og_description || "",
    tags:                articleJson.tags || "",
    excerpt:             articleJson.excerpt || "",
    // Store structured JSON for re-rendering if needed
    _article_json:       articleJson,
  };

  log("pipeline", `✔ Pipeline complete for #${articleId} — slug:"${processedArticle.slug}" quality:${quality_score}`);
  return processedArticle;
}

module.exports = { runPipeline, log };
