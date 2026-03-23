const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/stats", async (req, res) => {
  try {
    // Note: To do this concurrently clean, we can use promises, or just standard nested queries.
    // Wrap db.query in promises to await them cleanly.
    const queryAsync = (sql) => {
      return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    const results = await Promise.all([
      queryAsync("SELECT COUNT(*) as count FROM raw_articles"),
      queryAsync("SELECT COUNT(*) as count FROM raw_articles WHERE status='pending'"),
      queryAsync("SELECT COUNT(*) as count FROM raw_articles WHERE status='processed'"),
      queryAsync("SELECT COUNT(*) as count FROM articles"),
      queryAsync("SELECT COUNT(*) as count FROM articles WHERE status='draft'"),
      queryAsync("SELECT COUNT(*) as count FROM articles WHERE status='approved'"),
      queryAsync("SELECT COUNT(*) as count FROM articles WHERE status='published'")
    ]);

    const stats = {
      scraped: results[0][0].count || 0,
      pending: results[1][0].count || 0,
      processed: results[2][0].count || 0,
      total: results[3][0].count || 0,
      draft: results[4][0].count || 0,
      approved: results[5][0].count || 0,
      published: results[6][0].count || 0
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
