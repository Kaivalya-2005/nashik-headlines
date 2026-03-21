const express = require("express");
const router = express.Router();
const db = require("../db");
const { buildSeoPayload, calculateSeoScore } = require("../services/seo");

function withSeoMetrics(article) {
  const analysis = calculateSeoScore(article);
  return {
    ...article,
    seo_score: article.seo_score ?? analysis.score,
    seo_analysis: analysis,
  };
}

// 🔹 CREATE NEW ARTICLE
router.post("/articles", (req, res) => {
  const {
    title,
    content,
    summary,
    category,
    status,
    seo_title,
    meta_description,
    slug,
    keywords,
    image_url,
    image_alt,
    tags,
    source,
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const seoData = buildSeoPayload({
    title,
    content,
    summary,
    seo_title,
    meta_description,
    slug,
    keywords,
    image_alt,
    tags,
  });

  db.query(
    `INSERT INTO articles
    (title, content, summary, category, status, seo_title, meta_description, slug, keywords, image_url, image_alt, tags, source, seo_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      content,
      summary || "",
      category || "",
      status || "draft",
      seoData.seo_title,
      seoData.meta_description,
      seoData.slug,
      seoData.keywords,
      image_url || "",
      seoData.image_alt,
      typeof tags === "string" ? tags : JSON.stringify(tags || []),
      source || "manual",
      seoData.seo_score,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating article:", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        success: true,
        id: result.insertId,
        message: "Article created",
        seo_score: seoData.seo_score,
      });
    }
  );
});

// 🔹 GET SINGLE ARTICLE
router.get("/articles/:id", (req, res) => {
  db.query(
    "SELECT * FROM articles WHERE id=?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error("Error fetching article:", err);
        return res.status(500).json({ error: err.message });
      }
      if (!results || results.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(withSeoMetrics(results[0]));
    }
  );
});

// 🔹 GET ALL ARTICLES
router.get("/articles", (req, res) => {
  db.query(
    "SELECT * FROM articles ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json((results || []).map(withSeoMetrics));
    }
  );
});

// 🔹 GET PUBLISHED ARTICLES ONLY
router.get("/articles/published", (req, res) => {
  db.query(
    "SELECT * FROM articles WHERE status='published' ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching published articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json((results || []).map(withSeoMetrics));
    }
  );
});

// 🔹 APPROVE ARTICLE (draft → approved)
router.put("/articles/:id/approve", (req, res) => {
  db.query(
    "UPDATE articles SET status='approved' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("Error approving article:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "Approved ✅" });
    }
  );
});

// 🔹 PUBLISH ARTICLE (approved → published)
router.put("/articles/:id/publish", (req, res) => {
  db.query(
    "UPDATE articles SET status='published' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("Error publishing article:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "Published 🚀" });
    }
  );
});

// 🔹 EDIT ARTICLE (title, content, summary, category)
router.put("/articles/:id", (req, res) => {
  const {
    title,
    content,
    summary,
    category,
    seo_title,
    meta_description,
    slug,
    keywords,
    image_url,
    image_alt,
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const seoData = buildSeoPayload({
    title,
    content,
    summary,
    seo_title,
    meta_description,
    slug,
    keywords,
    image_alt,
  });

  db.query(
    "UPDATE articles SET title=?, content=?, summary=?, category=?, seo_title=?, meta_description=?, slug=?, keywords=?, image_url=?, image_alt=?, seo_score=? WHERE id=?",
    [
      title,
      content,
      summary || "",
      category || "",
      seoData.seo_title,
      seoData.meta_description,
      seoData.slug,
      seoData.keywords,
      image_url || "",
      seoData.image_alt,
      seoData.seo_score,
      req.params.id,
    ],
    (err) => {
      if (err) {
        console.error("Error updating article:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "Updated ✏️", seo_score: seoData.seo_score });
    }
  );
});

// 🔹 DELETE ARTICLE
router.delete("/articles/:id", (req, res) => {
  db.query("DELETE FROM articles WHERE id=?", [req.params.id], (err) => {
    if (err) {
      console.error("Error deleting article:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: "Deleted 🗑️" });
  });
});

// 🔹 GET RAW ARTICLES (unparsed scraped content)
router.get("/raw-articles", (req, res) => {
  db.query(
    "SELECT * FROM raw_articles ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching raw articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
    }
  );
});

// 🔹 GET PENDING RAW ARTICLES (unprocessed)
router.get("/raw-articles/pending", (req, res) => {
  db.query(
    "SELECT * FROM raw_articles WHERE status='pending' ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching pending articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
    }
  );
});

// 🔹 GET SYSTEM STATISTICS
router.get("/stats", (req, res) => {
  Promise.all([
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM raw_articles", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    }),
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM raw_articles WHERE status='pending'", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    }),
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM articles", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    }),
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM articles WHERE status='draft'", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    }),
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM articles WHERE status='approved'", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    }),
    new Promise((resolve) => {
      db.query("SELECT COUNT(*) as count FROM articles WHERE status='published'", (err, result) => {
        resolve(err ? 0 : result[0]?.count || 0);
      });
    })
  ]).then(([scraped, pending, total, draft, approved, published]) => {
    res.json({
      scraped,
      pending,
      total,
      draft,
      approved,
      published,
      processed: total - draft
    });
  }).catch((err) => {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  });
});

module.exports = router;