/**
 * routes/pipeline.js
 * ------------------
 * API routes for the AI processing pipeline.
 * BullMQ/Redis has been disabled; all processing now runs directly.
 */

const express = require("express");
const router = express.Router();
const { dbQuery, findDuplicate, saveArticle } = require("../services/aiPipeline/queue");
const { runPipeline, log } = require("../services/aiPipeline/pipelineService");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: run pipeline directly (no Redis/BullMQ required)
// ─────────────────────────────────────────────────────────────────────────────
async function runDirect(rawArticle) {
  const rawId = rawArticle.id;
  await dbQuery("UPDATE raw_articles SET status='processing' WHERE id=?", [rawId]);

  try {
    const processed = await runPipeline(rawArticle);

    const dupId = await findDuplicate(processed.title);
    if (dupId) {
      log("worker", `Duplicate detected for #${rawId} → dup of articles.id=${dupId}`, "warning");
      await dbQuery("UPDATE raw_articles SET status='duplicate' WHERE id=?", [rawId]);
      return { success: true, duplicate: true, duplicate_of: dupId };
    }

    const articleId = await saveArticle(processed);
    await dbQuery("UPDATE raw_articles SET status='processed' WHERE id=?", [rawId]);
    log("worker", `Direct run complete. Saved as articles.id=${articleId}`);
    return { success: true, article_id: articleId };
  } catch (err) {
    log("worker", `Direct run failed for #${rawId}: ${err.message}`, "error");
    await dbQuery("UPDATE raw_articles SET status='failed' WHERE id=?", [rawId]);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1  POST /api/pipeline/process/:id
// Process a single raw article by its ID
// ─────────────────────────────────────────────────────────────────────────────
router.post("/process/:id", async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) return res.status(400).json({ error: "Invalid article id" });

  let rows;
  try {
    rows = await dbQuery("SELECT * FROM raw_articles WHERE id=?", [rawId]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!rows || rows.length === 0) return res.status(404).json({ error: "Raw article not found" });

  const rawArticle = rows[0];

  if (["processing", "processed", "duplicate"].includes(rawArticle.status)) {
    return res.status(409).json({
      error: `Article already has status '${rawArticle.status}'`,
      status: rawArticle.status,
    });
  }

  try {
    const result = await runDirect(rawArticle);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2  POST /api/pipeline/process-pending
// Batch-process ALL pending raw articles
// ─────────────────────────────────────────────────────────────────────────────
router.post("/process-pending", async (req, res) => {
  let pending;
  try {
    pending = await dbQuery("SELECT * FROM raw_articles WHERE status='pending' ORDER BY created_at ASC");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!pending || pending.length === 0) {
    return res.json({ success: true, message: "No pending articles" });
  }

  res.json({
    success: true,
    message: `${pending.length} articles queued for processing (direct mode).`,
    isProcessing: true,
    total: pending.length,
  });

  (async () => {
    let done = 0;
    for (const rawArticle of pending) {
      try {
        await runDirect(rawArticle);
      } catch (_) {
        // already logged inside runDirect
      }
      done++;
      log("batch", `Direct batch: ${done}/${pending.length} done`);
    }
    log("batch", `Direct batch complete. Processed ${done} of ${pending.length} articles.`);
  })();
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3  GET /api/pipeline/status
// Returns a safe idle status. Always responds without using Redis.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  return res.json({
    isProcessing: false,
    total: 0,
    current: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
    cancel: false,
    note: "Queue disabled (Redis unavailable)",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4  POST /api/pipeline/cancel
// Queue controls are disabled. Keep endpoint for compatibility.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cancel", async (req, res) => {
  return res.json({ success: true, message: "Queue disabled (Redis unavailable)." });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 5  POST /api/pipeline/reprocess-failed
// Reset all 'failed' articles back to 'pending' and queue them for reprocessing
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reprocess-failed", async (req, res) => {
  let failed;
  try {
    failed = await dbQuery("SELECT * FROM raw_articles WHERE status='failed' ORDER BY created_at ASC");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!failed || failed.length === 0) {
    return res.json({ success: true, message: "No skipped articles to reprocess." });
  }

  // Reset all to pending
  try {
    await dbQuery("UPDATE raw_articles SET status='pending' WHERE status='failed'");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Re-fetch with fresh 'pending' status
  const pending = failed.map(a => ({ ...a, status: "pending" }));

  res.json({
    success: true,
    message: `${pending.length} skipped articles reset and queued for reprocessing (direct mode).`,
    isProcessing: true,
    total: pending.length,
  });

  (async () => {
    let done = 0;
    for (const rawArticle of pending) {
      try {
        await runDirect(rawArticle);
      } catch (_) {
        // logged inside runDirect
      }
      done++;
      log("batch", `Reprocess batch: ${done}/${pending.length} done`);
    }
    log("batch", `Reprocess batch complete. ${done}/${pending.length} articles done.`);
  })();
});

module.exports = router;
