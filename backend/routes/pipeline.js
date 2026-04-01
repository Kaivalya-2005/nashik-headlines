/**
 * routes/pipeline.js
 * ------------------
 * API routes for the AI processing pipeline.
 * Powered by BullMQ + Redis.
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { articleQueue, dbQuery } = require("../services/aiPipeline/queue");

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1  POST /api/pipeline/process/:id
// Process a single raw article by its ID
// ─────────────────────────────────────────────────────────────────────────────

router.post("/process/:id", async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) return res.status(400).json({ error: "Invalid article id" });

  const rows = await dbQuery("SELECT * FROM raw_articles WHERE id = ?", [rawId]).catch(
    (err) => { res.status(500).json({ error: err.message }); return null; }
  );
  if (!rows || rows.length === 0) return res.status(404).json({ error: "Raw article not found" });

  const rawArticle = rows[0];

  if (["processing", "processed", "duplicate"].includes(rawArticle.status)) {
    return res.status(409).json({
      error: `Article already has status '${rawArticle.status}'`,
      status: rawArticle.status,
    });
  }

  try {
    const job = await articleQueue.add("process-single", { rawArticle }, { jobId: `article-${rawId}` });

    return res.status(202).json({
      success: true,
      message: "Processing job added to queue ✅",
      jobId: job.id
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3  GET /api/pipeline/status
// Retrieves job counts from BullMQ to report progress
// ─────────────────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  try {
    const counts = await articleQueue.getJobCounts();
    // BullMQ counts: waiting, active, completed, failed, delayed, ...
    
    // Fallback UI data
    const pipelineState = {
      isProcessing: counts.active > 0 || counts.waiting > 0,
      total: counts.waiting + counts.active + counts.completed + counts.failed,
      current: counts.active > 0 ? 1 : 0, 
      processed: counts.completed,
      duplicates: 0, // tracked via completed state metadata theoretically, but 0 is fine for basic ui
      failed: counts.failed,
      cancel: false
    };
    
    res.json(pipelineState);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4  POST /api/pipeline/cancel
// Removes waiting jobs from the queue (cannot easily abort running AI calls)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cancel", async (req, res) => {
  try {
    await articleQueue.obliterate({ force: true });
    return res.json({ success: true, message: "Queue cleared. Active jobs will finish." });
  } catch(e) {
    return res.json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2  POST /api/pipeline/process-pending
// Batch-process ALL pending raw articles using BullMQ
// ─────────────────────────────────────────────────────────────────────────────

router.post("/process-pending", async (req, res) => {
  let pending;
  try {
    pending = await dbQuery("SELECT * FROM raw_articles WHERE status='pending' ORDER BY created_at ASC");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (pending.length === 0) {
    return res.json({ success: true, message: "No pending articles" });
  }

  try {
    // Add all pending articles to queue
    const jobs = pending.map(rawArticle => ({
      name: "process-batch",
      data: { rawArticle },
      opts: { jobId: `article-${rawArticle.id}` }
    }));
    
    await articleQueue.addBulk(jobs);

    return res.json({
      success: true,
      message: `${pending.length} articles added to processing queue. Check /status for progress.`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
