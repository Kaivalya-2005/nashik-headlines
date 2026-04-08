/**
 * pipelineService.js
 * ------------------
 * Orchestrates all AI agents sequentially:
 *
 *  Step 1 → cleanAgent    : strip HTML/ads/whitespace, detect language
 *  Step 2 → unifiedAgent  : single LLM call for rewrite, category, SEO, and AI confidence
 *  Step 3 → qualityAgent  : fast pure JS checks for readability, repetition, length
 *
 * Returns the final processed article object ready for DB insertion,
 * including quality metrics and a `quality_gate` object for threshold checks.
 */

const db = require("../../db");
const { clean }         = require("./cleanAgent");
const { processAllInOne } = require("./unifiedAgent");
const { checkQuality }  = require("./qualityAgent"); // For sync checks only
const { generateImage } = require("./imageAgent");

// ── Quality Thresholds ────────────────────────────────────────────────────────
const QUALITY_THRESHOLD   = 50;   // ai_confidence below this → fail
const READABILITY_MINIMUM = 40;   // readability below this → flag for review
const MIN_WORD_COUNT      = 20;   // min words for final output (input can be short RSS summary — AI expands it)

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
  log("pipeline", `▶ Starting unified pipeline for raw_article #${articleId}: "${rawArticle.title?.slice(0, 60)}"`);

  // ── STEP 1: CLEAN (Fast JS)
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

  // ── STEP 2: UNIFIED AI AGENT (Single API Call)
  log("unified_agent", `Generating rewrite, category, and SEO via single Groq call for #${articleId}`);
  let processedData;
  try {
    processedData = await processAllInOne(clean_title, clean_content);
    log("unified_agent", `Done — ${processedData.rewritten_content?.split(/\s+/).length} words generated. Category: ${processedData.category}`);
  } catch(err) {
    log("unified_agent", `Failed: ${err.message}`, "error");
    throw new Error(`unifiedAgent failed: ${err.message}`);
  }

  // Destructure results carefully
  const rewritten_content = processedData.rewritten_content || clean_content;
  const rewritten_title = processedData.rewritten_title || clean_title;
  const category = processedData.category || "Local News";
  const seoData = processedData.seo || {};
  const ai_confidence = processedData.quality?.ai_confidence || 70;

  // ── STEP 3: IMAGE GENERATION
  log("image_agent", `Generating featured image for article #${articleId}`);
  let image_url = "";
  try {
    image_url = await generateImage(rewritten_title, seoData.keywords || category);
    log("image_agent", `Done — Image generated successfully`);
  } catch(err) {
    log("image_agent", `Skipped/failed: ${err.message}`, "warning");
  }

  // ── STEP 4: SYNC QUALITY CHECK (Length, Readability, Repetition)
  log("quality_check_start", `Running pure JS quality validation for article #${articleId}`);
  let quality;
  try {
    // Modify checkQuality to only do sync checks if we pass a short-circuit
    // Temporarily relying on imported checkQuality but avoiding its own LLM call if possible
    quality = await checkQuality(rewritten_title, rewritten_content);
    // Overwrite with the ai_confidence we ALREADY fetched!
    quality.ai_confidence = ai_confidence;
    
    const warnSummary = quality.warnings.length > 0
      ? `Warnings: ${quality.warnings.join(" | ")}`
      : "No warnings";
    log(
      "quality_check_pass",
      `Done — readability:${quality.readability_score} ai_confidence:${quality.ai_confidence} ` +
      `words:${quality.content_length}. ${warnSummary}`
    );
  } catch(err) {
    // If checkQuality fails via rate limit on Groq (because inside checkQuality it might STILL call it depending on logic)
    // we bypass. Ideally we'd remove getAiConfidence from checkQuality, but this guarantees fallback.
    log("quality_check_fail", `Quality check threw: ${err.message}`, "error");
    quality = { readability_score: 50, ai_confidence: ai_confidence, content_length: 0, warnings: [] };
  }

  // ── THRESHOLD ENFORCEMENT ─────────────────────────────────────────────
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

  const needsReview = quality.readability_score < READABILITY_MINIMUM;
  if (needsReview) {
    log("quality_check_pass",
      `Low readability (${quality.readability_score}) — article will be flagged for admin review`,
      "warning"
    );
  }

  const quality_score = Math.round(
    quality.ai_confidence * 0.50 +
    quality.readability_score * 0.30 +
    (seoData.seo_score || 0) * 0.20
  );

  // ── ASSEMBLE FINAL ARTICLE ────────────────────────────────────────────
  const processedArticle = {
    title:             rewritten_title,
    content:           rewritten_content,
    summary:           rewritten_content.slice(0, 250).replace(/\n/g, " ").trim() + "…",
    category,
    seo_title:         seoData.seo_title || rewritten_title,
    meta_description:  seoData.meta_description || "",
    keywords:          seoData.keywords || "",
    slug:              seoData.slug || rewritten_title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    image_url:         image_url,
    seo_score:         seoData.seo_score || 0,
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
