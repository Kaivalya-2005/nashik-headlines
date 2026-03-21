const express = require("express");
const router = express.Router();
const scraper = require("../services/scraperProcess");
const { fetchNews } = require("../services/scraper");
const db = require("../db");

router.get("/scrape/status", (req, res) => {
  res.json(scraper.getStatus());
});

router.post("/scrape", async (req, res) => {
  try {
    const articles = await fetchNews();
    let inserted = 0;

    for (const a of articles) {
      await new Promise((resolve) => {
        db.query(
          "INSERT IGNORE INTO raw_articles (title, content, url, source) VALUES (?, ?, ?, ?)",
          [a.title, a.content || "", a.url, a.source || ""],
          (err, result) => {
            if (!err && result?.affectedRows) inserted += 1;
            resolve();
          }
        );
      });
    }

    res.send(`Real News Scraped & Stored ✅ (${inserted})`);
  } catch (err) {
    console.log(err);
    res.status(500).send("Scraping failed ❌");
  }
});

router.post("/scrape/toggle", (req, res) => {
  if (typeof req.body?.enabled === "undefined") {
    return res.status(400).json({ error: "enabled flag is required" });
  }
  const enabled = Boolean(req.body.enabled);
  const result = enabled ? scraper.startLoop() : scraper.stopLoop();
  res.json({ enabled, ...result });
});

router.post("/scrape/run-once", async (req, res) => {
  try {
    const result = await scraper.runOnce();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      stdout: err.stdout,
      stderr: err.stderr
    });
  }
});

module.exports = router;