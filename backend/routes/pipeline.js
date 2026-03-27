/**
 * routes/pipeline.js
 * ------------------
 * API routes for the AI processing pipeline.
 *
 * POST /api/pipeline/process/:id       — process a single raw article
 * POST /api/pipeline/process-pending   — batch-process all pending articles
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { runPipeline, log } = require("../services/aiPipeline/pipelineService");

// ── Config ──────────────────────────────────────────────────────────────────
const BATCH_SIZE = 3; // max articles processed concurrently (avoids rate limits)
const DUPLICATE_THRESHOLD = 0.80; // 80% similarity → mark as duplicate

// ── DB Promise Helpers ───────────────────────────────────────────────────────

function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// ── Duplicate Detection ──────────────────────────────────────────────────────

/**
 * Compute a simple similarity ratio between two strings.
 * Uses bigram overlap — fast enough for title comparison.
 */
function bigrams(str) {
  const s = String(str).toLowerCase().replace(/\s+/g, " ").trim();
  const bg = new Set();
  for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
  return bg;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const setA = bigrams(a);
  const setB = bigrams(b);
  const intersection = [...setA].filter((v) => setB.has(v)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check whether a similar article already exists in the articles table.
 * Compares incoming title against the 200 most-recent article titles.
 * Returns the matching article id if duplicate, or null.
 */
async function findDuplicate(candidateTitle) {
  const rows = await dbQuery(
    "SELECT id, title FROM articles ORDER BY created_at DESC LIMIT 200"
  );
  for (const row of rows) {
    if (similarity(candidateTitle, row.title) >= DUPLICATE_THRESHOLD) {
      return row.id;
    }
  }
  return null;
}

// ── Category/Source Resolvers ────────────────────────────────────────────────

async function resolveCategoryId(categoryName) {
  if (!categoryName) return null;
  const slug = String(categoryName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const rows = await dbQuery(
    "SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1",
    [slug, categoryName]
  );
  if (rows.length > 0) return rows[0].id;

  const ins = await dbQuery(
    "INSERT INTO categories (name, slug) VALUES (?, ?)",
    [categoryName, slug]
  );
  return ins.insertId;
}

async function resolveSourceId(sourceName) {
  if (!sourceName) return null;
  const rows = await dbQuery(
    "SELECT id FROM sources WHERE name = ? LIMIT 1",
    [sourceName]
  );
  if (rows.length > 0) return rows[0].id;

  const ins = await dbQuery(
    "INSERT INTO sources (name, url, type) VALUES (?, ?, ?)",
    [sourceName, "", "api"]
  );
  return ins.insertId;
}

// ── Slug Uniqueness ──────────────────────────────────────────────────────────

/**
 * Ensure slug is unique — append a short timestamp suffix if needed.
 */
async function ensureUniqueSlug(slug) {
  let candidate = slug;
  let attempt = 0;
  while (true) {
    const rows = await dbQuery(
      "SELECT id FROM articles WHERE slug = ? LIMIT 1",
      [candidate]
    );
    if (rows.length === 0) return candidate;
    attempt++;
    candidate = `${slug}-${Date.now().toString(36)}`;
    if (attempt > 5) break; // safety valve
  }
  return candidate;
}

// ── Save Processed Article ───────────────────────────────────────────────────

async function saveArticle(processed) {
  const categoryId = await resolveCategoryId(processed.category);
  const sourceId = await resolveSourceId(processed.source);
  const slug = await ensureUniqueSlug(processed.slug);

  const result = await dbQuery(
    `INSERT INTO articles
      (title, content, summary, category_id, status,
       seo_title, meta_description, slug, keywords, seo_score, source_id,
       quality_score, readability_score, ai_confidence)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      processed.title,
      processed.content,
      processed.summary || "",
      categoryId || null,
      processed.seo_title || "",
      processed.meta_description || "",
      slug,
      processed.keywords || "",
      processed.seo_score || 0,
      sourceId || null,
      processed.quality_score || 0,
      processed.readability_score || 0,
      processed.ai_confidence || 0,
    ]
  );

  log("save", `Article saved — articles.id=${result.insertId}, slug="${slug}", quality_score=${processed.quality_score}`);
  return result.insertId;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1  POST /api/pipeline/process/:id
// Process a single raw article by its ID
// ─────────────────────────────────────────────────────────────────────────────

router.post("/process/:id", async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) return res.status(400).json({ error: "Invalid article id" });

  // Fetch raw article
  const rows = await dbQuery("SELECT * FROM raw_articles WHERE id = ?", [rawId]).catch(
    (err) => { res.status(500).json({ error: err.message }); return null; }
  );
  if (!rows) return;
  if (rows.length === 0) return res.status(404).json({ error: "Raw article not found" });

  const rawArticle = rows[0];

  // Guard: skip already-processed or currently-processing articles
  if (["processing", "processed", "duplicate"].includes(rawArticle.status)) {
    return res.status(409).json({
      error: `Article already has status '${rawArticle.status}'`,
      status: rawArticle.status,
    });
  }

  // Mark as processing immediately (prevents parallel duplicate runs)
  await dbQuery("UPDATE raw_articles SET status='processing' WHERE id=?", [rawId]);

  try {
    // Run the pipeline
    const processed = await runPipeline(rawArticle);

    // Duplicate detection
    const dupId = await findDuplicate(processed.title);
    if (dupId) {
      log("duplicate", `Article #${rawId} is a duplicate of articles.id=${dupId}`, "warning");
      await dbQuery("UPDATE raw_articles SET status='duplicate' WHERE id=?", [rawId]);
      return res.json({
        success: true,
        duplicate: true,
        duplicate_of: dupId,
        raw_id: rawId,
        message: "Article marked as duplicate — not saved.",
      });
    }

    // Save to articles table
    const articleId = await saveArticle(processed);

    // Mark raw article as processed
    await dbQuery("UPDATE raw_articles SET status='processed' WHERE id=?", [rawId]);

    return res.status(201).json({
      success: true,
      duplicate: false,
      article_id: articleId,
      raw_id: rawId,
      slug: processed.slug,
      seo_score: processed.seo_score,
      quality_score: processed.quality_score,
      readability_score: processed.readability_score,
      ai_confidence: processed.ai_confidence,
      quality_warnings: processed.quality_warnings || [],
      needs_review: processed.needs_review || false,
      category: processed.category,
      message: "Article processed and saved as draft ✅",
    });
  } catch (err) {
    log("pipeline", `Failed for raw_article #${rawId}: ${err.message}`, "error");
    await dbQuery("UPDATE raw_articles SET status='failed' WHERE id=?", [rawId]);
    // Distinguish quality gate failures from technical failures
    if (err.qualityFail) {
      return res.status(422).json({
        success: false,
        quality_failure: true,
        raw_id: rawId,
        error: err.message,
        quality_metrics: err.qualityMetrics || null,
      });
    }
    return res.status(500).json({
      success: false,
      raw_id: rawId,
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2  POST /api/pipeline/process-pending
// Batch-process ALL pending raw articles in configurable batches
// ─────────────────────────────────────────────────────────────────────────────

router.post("/process-pending", async (req, res) => {
  // Fetch all pending articles
  let pending;
  try {
    pending = await dbQuery(
      "SELECT * FROM raw_articles WHERE status='pending' ORDER BY created_at ASC"
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (pending.length === 0) {
    return res.json({ success: true, message: "No pending articles", total: 0, processed: 0, duplicates: 0, failed: 0 });
  }

  log("pipeline", `▶ Batch processing ${pending.length} pending articles (batch size: ${BATCH_SIZE})`);

  const stats = { total: pending.length, processed: 0, duplicates: 0, failed: 0 };

  // Process in chunks of BATCH_SIZE to avoid API rate limits
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (rawArticle) => {
        // Skip non-pending (may have been updated by a concurrent call)
        if (!["pending"].includes(rawArticle.status)) return;

        // Mark as processing
        await dbQuery("UPDATE raw_articles SET status='processing' WHERE id=?", [rawArticle.id]).catch(() => {});

        try {
          const processed = await runPipeline(rawArticle);

          // Duplicate detection
          const dupId = await findDuplicate(processed.title);
          if (dupId) {
            log("duplicate", `#${rawArticle.id} → duplicate of articles.id=${dupId}`, "warning");
            await dbQuery("UPDATE raw_articles SET status='duplicate' WHERE id=?", [rawArticle.id]);
            stats.duplicates++;
            return;
          }

          await saveArticle(processed);
          await dbQuery("UPDATE raw_articles SET status='processed' WHERE id=?", [rawArticle.id]);
          stats.processed++;
        } catch (err) {
          if (err.qualityFail) {
            log("quality_check_fail", `#${rawArticle.id} failed quality gate: ${err.message}`, "error");
          } else {
            log("pipeline", `#${rawArticle.id} failed: ${err.message}`, "error");
          }
          await dbQuery("UPDATE raw_articles SET status='failed' WHERE id=?", [rawArticle.id]).catch(() => {});
          stats.failed++;
        }
      })
    );

    // Brief pause between batches to give the API breathing room
    if (i + BATCH_SIZE < pending.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  log("pipeline", `✔ Batch complete — processed:${stats.processed} duplicates:${stats.duplicates} failed:${stats.failed}`);

  return res.json({
    success: true,
    message: "Batch processing complete ✅",
    ...stats,
  });
});

module.exports = router;
