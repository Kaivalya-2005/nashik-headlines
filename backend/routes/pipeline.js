/**
 * routes/pipeline.js
 * ------------------
 * API routes for the AI processing pipeline.
 * Powered by BullMQ + Redis (with direct fallback if Redis is unavailable).
 */

const express = require("express");
const router = express.Router();
const { articleQueue, dbQuery, findDuplicate, saveArticle } = require("../services/aiPipeline/queue");
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
    rows = await dbQuery("SELECT * FROM raw_articles WHERE id=$1", [rawId]);
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

  // ── BullMQ path (Redis available) ──────────────────────────────────────────
  if (articleQueue) {
    try {
      const job = await articleQueue.add("process-single", { rawArticle }, { jobId: `article-${rawId}` });
      return res.status(202).json({
        success: true,
        message: "Processing job added to queue ✅",
        jobId: job.id,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Direct path (Redis unavailable) ────────────────────────────────────────
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

  // ── BullMQ path (Redis available) ──────────────────────────────────────────
  if (articleQueue) {
    try {
      const jobs = pending.map((rawArticle) => ({
        name: "process-batch",
        data: { rawArticle },
        opts: { jobId: `article-${rawArticle.id}` },
      }));

      await articleQueue.addBulk(jobs);

      return res.json({
        success: true,
        message: `${pending.length} articles added to processing queue. Check /status for progress.`,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Direct path (Redis unavailable) — process one at a time ───────────────
  // Respond immediately so the browser doesn't time out, then process in background
  res.json({
    success: true,
    message: `${pending.length} articles queued for processing (direct mode — Redis unavailable).`,
    isProcessing: true,
    total: pending.length,
  });

  // Process in background without holding the HTTP response
  (async () => {
    let done = 0;
    for (const rawArticle of pending) {
      try {
        await runDirect(rawArticle);
      } catch (err) {
        // already logged and status set to 'failed' inside runDirect
      }
      done++;
      log("batch", `Direct batch: ${done}/${pending.length} done`);
    }
    log("batch", `Direct batch complete. Processed ${done} of ${pending.length} articles.`);
  })();
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3  GET /api/pipeline/status
// Retrieves job counts from BullMQ to report progress
// ─────────────────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  // ── No Redis — return a safe static response ───────────────────────────────
  if (!articleQueue) {
    return res.json({
      isProcessing: false,
      total: 0,
      current: 0,
      processed: 0,
      duplicates: 0,
      failed: 0,
      cancel: false,
      note: "Queue disabled (Redis unavailable) — running in direct mode",
    });
  }

  try {
    const counts = await articleQueue.getJobCounts();
    const pipelineState = {
      isProcessing: counts.active > 0 || counts.waiting > 0,
      total: (counts.waiting || 0) + (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0),
      current: counts.active > 0 ? 1 : 0,
      processed: counts.completed || 0,
      duplicates: 0,
      failed: counts.failed || 0,
      cancel: false,
    };
    res.json(pipelineState);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4  POST /api/pipeline/cancel
// Removes waiting jobs from the queue
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cancel", async (req, res) => {
  if (!articleQueue) {
    return res.json({ success: true, message: "Queue not running (Redis unavailable)." });
  }

  try {
    await articleQueue.obliterate({ force: true });
    return res.json({ success: true, message: "Queue cleared. Active jobs will finish." });
  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

module.exports = router;
