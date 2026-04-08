/**
 * routes/pipeline.js
 * ------------------
 * API routes for the AI processing pipeline.
 * Powered by BullMQ + Redis, with graceful fallback to direct execution
 * when Redis is unavailable or the connection drops.
 */

const express = require("express");
const router = express.Router();
const { articleQueue, dbQuery, findDuplicate, saveArticle } = require("../services/aiPipeline/queue");
const { runPipeline, log } = require("../services/aiPipeline/pipelineService");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: check if an error is a Redis/BullMQ connectivity error
// ─────────────────────────────────────────────────────────────────────────────
function isRedisError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("connection is closed") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("stream isn't writeable") ||
    msg.includes("enableofflinequeue") ||
    err?.code === "ECONNREFUSED" ||
    err?.code === "ENOTFOUND"
  );
}

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

  // ── Try BullMQ first, fall back to direct on Redis error ──────────────────
  if (articleQueue) {
    try {
      const job = await articleQueue.add("process-single", { rawArticle }, { jobId: `article-${rawId}` });
      return res.status(202).json({
        success: true,
        message: "Processing job added to queue ✅",
        jobId: job.id,
      });
    } catch (err) {
      if (!isRedisError(err)) {
        return res.status(500).json({ success: false, error: err.message });
      }
      // Redis error — fall through to direct execution
      log("pipeline", `Redis unavailable for /process/${rawId} — falling back to direct mode`, "warning");
    }
  }

  // ── Direct execution fallback ─────────────────────────────────────────────
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

  // ── Try BullMQ, fall back to direct on Redis error ────────────────────────
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
      if (!isRedisError(err)) {
        return res.status(500).json({ error: err.message });
      }
      // Redis error — fall through to direct execution
      log("pipeline", "Redis unavailable for /process-pending — falling back to direct mode", "warning");
    }
  }

  // ── Direct execution fallback (background) ────────────────────────────────
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
// Returns BullMQ job counts. NEVER returns 500 — always responds safely.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  // Safe fallback used when queue is absent or Redis connection fails
  const safeFallback = {
    isProcessing: false,
    total: 0,
    current: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
    cancel: false,
  };

  if (!articleQueue) {
    return res.json({ ...safeFallback, note: "Queue disabled (Redis unavailable)" });
  }

  try {
    const counts = await articleQueue.getJobCounts();
    return res.json({
      isProcessing: (counts.active || 0) > 0 || (counts.waiting || 0) > 0,
      total: (counts.waiting || 0) + (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0),
      current: (counts.active || 0) > 0 ? 1 : 0,
      processed: counts.completed || 0,
      duplicates: 0,
      failed: counts.failed || 0,
      cancel: false,
    });
  } catch (err) {
    // Log but NEVER crash with 500 — the frontend polls this every 3 seconds
    console.warn("⚠️  /pipeline/status BullMQ error (returning safe fallback):", err.message);
    return res.json({ ...safeFallback, note: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4  POST /api/pipeline/cancel
// Clears the BullMQ queue. Safe when Redis is down.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cancel", async (req, res) => {
  if (!articleQueue) {
    return res.json({ success: true, message: "Queue not running (Redis unavailable)." });
  }

  try {
    await articleQueue.obliterate({ force: true });
    return res.json({ success: true, message: "Queue cleared. Active jobs will finish." });
  } catch (err) {
    // Graceful failure instead of 500
    return res.json({ success: false, message: err.message });
  }
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

  // ── Try BullMQ, fall back to direct ──────────────────────────────────────
  if (articleQueue) {
    try {
      const jobs = pending.map((rawArticle) => ({
        name: "process-batch",
        data: { rawArticle },
        opts: { jobId: `article-${rawArticle.id}-retry` },
      }));
      await articleQueue.addBulk(jobs);
      return res.json({
        success: true,
        message: `${pending.length} skipped articles reset to pending and added to queue.`,
      });
    } catch (err) {
      if (!isRedisError(err)) {
        return res.status(500).json({ error: err.message });
      }
      log("pipeline", "Redis unavailable for /reprocess-failed — falling back to direct mode", "warning");
    }
  }

  // ── Direct fallback ───────────────────────────────────────────────────────
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
