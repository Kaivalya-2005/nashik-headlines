// =====================================================
// BACKEND API IMPLEMENTATION (Node.js/Express)
// =====================================================
//
// If your backend routes are not yet implemented,
// use these exact implementations for all required APIs
//

// ========== routes/articles.js ==========

const express = require("express");
const router = express.Router();
const db = require("../db");

// 🔹 Get all articles
router.get("/articles", (req, res) => {
  db.query("SELECT * FROM articles ORDER BY created_at DESC", (err, data) => {
    if (err) return res.status(500).send(err);
    res.json(data);
  });
});

// 🔹 Get only published articles
router.get("/articles/published", (req, res) => {
  db.query(
    "SELECT * FROM articles WHERE status='published' ORDER BY created_at DESC",
    (err, data) => {
      if (err) return res.status(500).send(err);
      res.json(data);
    }
  );
});

// 🔹 Approve article (draft -> approved)
router.put("/articles/:id/approve", (req, res) => {
  db.query(
    "UPDATE articles SET status='approved' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Approved ✅");
    }
  );
});

// 🔹 Publish article (approved -> published)
router.put("/articles/:id/publish", (req, res) => {
  db.query(
    "UPDATE articles SET status='published' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Published 🚀");
    }
  );
});

// 🔹 Edit article (title, content, summary)
router.put("/articles/:id", (req, res) => {
  const { title, content, summary } = req.body;

  if (!title || !content) {
    return res.status(400).send("Title and content are required");
  }

  db.query(
    "UPDATE articles SET title=?, content=?, summary=? WHERE id=?",
    [title, content, summary || "", req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Updated ✏️");
    }
  );
});

// 🔹 Delete article
router.delete("/articles/:id", (req, res) => {
  db.query("DELETE FROM articles WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Deleted 🗑️");
  });
});

module.exports = router;

// ========== routes/scrape.js (if not implemented) ==========
/*
const express = require("express");
const router = express.Router();

router.post("/scrape", (req, res) => {
  // Your scraper logic here
  // Should fetch news and insert into raw_articles table
  res.send("Scraper started ✅");
});

module.exports = router;
*/

// ========== routes/process.js (if not implemented) ==========
/*
const express = require("express");
const router = express.Router();
const { processWithAI } = require("../services/ai");

router.post("/process", (req, res) => {
  // Your AI processing logic here
  // Should process raw_articles and insert into articles
  res.send("Processing started ✅");
});

module.exports = router;
*/

// ========== DATABASE SETUP ==========
// Make sure your MySQL schema includes:
/*
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT NOT NULL,
  content LONGTEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100),
  tags JSON,
  seo_title TEXT,
  image_url TEXT,
  status ENUM('draft','approved','published') DEFAULT 'draft',
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
*/

// ========== VERIFICATION CHECKLIST ==========
/*
✅ articles.js has GET /articles endpoint
✅ articles.js has PUT /articles/:id/approve endpoint
✅ articles.js has PUT /articles/:id/publish endpoint
✅ articles.js has PUT /articles/:id endpoint (edit)
✅ scrape.js has POST /scrape endpoint
✅ process.js has POST /process endpoint
✅ Database connection working in db.js
✅ CORS enabled in index.js
✅ JSON parsing enabled with express.json()
✅ Backend running on port 5000
*/
