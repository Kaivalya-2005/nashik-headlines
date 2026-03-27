/**
 * pipelineService.js
 * ------------------
 * Orchestrates all AI agents sequentially:
 *
 *  Step 1 → cleanAgent    : strip HTML/ads/whitespace, detect language
 *  Step 2 → rewriteAgent  : professional AI rewrite (400-600 words)
 *  Step 3 → categoryAgent : classify into predefined categories
 *  Step 4 → seoAgent      : SEO title, meta, keywords, slug, score
 *  Step 5 → qualityAgent  : readability, clickbait, repetition, AI confidence
 *
 * Returns the final processed article object ready for DB insertion,
 * including quality metrics and a `quality_gate` object for threshold checks.
 */

const db = require("../../db");
const { clean }         = require("./cleanAgent");
const { rewrite }       = require("./rewriteAgent");
const { categorize }    = require("./categoryAgent");
const { generateSeo }   = require("./seoAgent");
const { checkQuality }  = require("./qualityAgent");

// ── Quality Thresholds ────────────────────────────────────────────────────────
const QUALITY_THRESHOLD   = 50;   // ai_confidence below this → fail
const READABILITY_MINIMUM = 40;   // readability below this → flag for review
const MIN_WORD_COUNT      = 200;  // fewer words than this → fail

// ── DB Logging Helper ─────────────────────────────────────────────────────────

/**
 * Write a pipeline step log entry to the `logs` table.
 * Non-blocking — errors are only printed to console.
 */
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

/**
 * Run the full AI pipeline for a single raw article object.
 * @param {Object} rawArticle - Record from raw_articles: { id, title, content, source, url }
 * @returns {Object} processedArticle ready to INSERT into articles
 * @throws {Error} with .qualityFail=true if article fails quality thresholds
 */
async function runPipeline(rawArticle) {
  const articleId = rawArticle.id;
  log("pipeline", `▶ Starting pipeline for raw_article #${articleId}: "${rawArticle.title?.slice(0, 60)}"`);

  // ── STEP 1: CLEAN ─────────────────────────────────────────────────────
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

  // Guard: skip rewrite if content too short after cleaning
  if (clean_content.split(/\s+/).filter(Boolean).length < 30) {
    log("clean", "Content too short after cleaning — article skipped", "warning");
    throw new Error("Article content too short to process");
  }

  // ── STEP 2: REWRITE ───────────────────────────────────────────────────
  log("rewrite", `Rewriting article #${articleId} via Groq API`);
  let rewritten;
  try {
    rewritten = await rewrite(clean_title, clean_content);
    const wc = rewritten.rewritten_content.split(/\s+/).filter(Boolean).length;
    log("rewrite", `Done — ${wc} words`);
  } catch (err) {
    log("rewrite", `Failed: ${err.message}`, "error");
    throw new Error(`rewriteAgent failed: ${err.message}`);
  }

  const { rewritten_title, rewritten_content } = rewritten;

  // ── STEP 3: CATEGORIZE ────────────────────────────────────────────────
  log("category", `Classifying article #${articleId}`);
  let categorized;
  try {
    categorized = await categorize(rewritten_title, rewritten_content);
    log("category", `Category: ${categorized.category}`);
  } catch (err) {
    log("category", `Failed: ${err.message} — defaulting to 'Local News'`, "warning");
    categorized = { category: "Local News" };
  }

  const { category } = categorized;

  // ── STEP 4: SEO ───────────────────────────────────────────────────────
  log("seo", `Generating SEO metadata for article #${articleId}`);
  let seoData;
  try {
    seoData = await generateSeo(rewritten_title, rewritten_content, category);
    log("seo", `Done — SEO score: ${seoData.seo_score}, slug: ${seoData.slug}`);
  } catch (err) {
    log("seo", `SEO generation failed: ${err.message}`, "error");
    throw new Error(`seoAgent failed: ${err.message}`);
  }

  // ── STEP 5: QUALITY CHECK ─────────────────────────────────────────────
  log("quality_check_start", `Running quality validation for article #${articleId}`);
  let quality;
  try {
    quality = await checkQuality(rewritten_title, rewritten_content);
    const warnSummary = quality.warnings.length > 0
      ? `Warnings: ${quality.warnings.join(" | ")}`
      : "No warnings";
    log(
      "quality_check_pass",
      `Done — readability:${quality.readability_score} ai_confidence:${quality.ai_confidence} ` +
      `words:${quality.content_length}. ${warnSummary}`
    );
  } catch (err) {
    log("quality_check_fail", `Quality check threw: ${err.message}`, "error");
    // Non-fatal — use safe defaults so the pipeline doesn't stop
    quality = { readability_score: 50, ai_confidence: 70, content_length: 0, warnings: [] };
  }

  // ── THRESHOLD ENFORCEMENT ─────────────────────────────────────────────
  // Hard failures → caller marks status='failed'
  if (quality.ai_confidence < QUALITY_THRESHOLD) {
    const msg = `Quality gate failed: ai_confidence ${quality.ai_confidence} < ${QUALITY_THRESHOLD}`;
    log("quality_check_fail", msg, "error");
    const err = new Error(msg);
    err.qualityFail = true;
    err.qualityMetrics = quality;
    throw err;
  }

  if (quality.content_length < MIN_WORD_COUNT) {
    const msg = `Quality gate failed: content too short (${quality.content_length} words)`;
    log("quality_check_fail", msg, "error");
    const err = new Error(msg);
    err.qualityFail = true;
    err.qualityMetrics = quality;
    throw err;
  }

  // Soft flag: low readability → include in warnings but don't fail
  const needsReview = quality.readability_score < READABILITY_MINIMUM;
  if (needsReview) {
    log("quality_check_pass",
      `Low readability (${quality.readability_score}) — article will be flagged for admin review`,
      "warning"
    );
  }

  // Composite quality score: weighted average of ai_confidence + readability + seo
  const quality_score = Math.round(
    quality.ai_confidence * 0.50 +
    quality.readability_score * 0.30 +
    seoData.seo_score * 0.20
  );

  // ── ASSEMBLE FINAL ARTICLE ────────────────────────────────────────────
  const processedArticle = {
    title:             rewritten_title,
    content:           rewritten_content,
    summary:           rewritten_content.slice(0, 250).replace(/\n/g, " ").trim() + "…",
    category,
    seo_title:         seoData.seo_title,
    meta_description:  seoData.meta_description,
    keywords:          seoData.keywords,
    slug:              seoData.slug,
    seo_score:         seoData.seo_score,
    quality_score,
    readability_score: quality.readability_score,
    ai_confidence:     quality.ai_confidence,
    quality_warnings:  quality.warnings,
    needs_review:      needsReview,
    language,
    source:            rawArticle.source || null,
    raw_article_id:    articleId,
    status:            "draft",
  };

  log("pipeline", `✔ Pipeline complete for raw_article #${articleId} → slug:"${processedArticle.slug}" quality:${quality_score}`);
  return processedArticle;
}

module.exports = { runPipeline, log };
