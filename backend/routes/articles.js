const express = require("express");
const router = express.Router();
const db = require("../db");
const { buildSeoPayload, calculateSeoScore } = require("../services/seo");

function withSeoMetrics(article) {
  const analysis = calculateSeoScore(article);
  return {
    ...article,
    category: article.category_name || "Uncategorized",
    source: article.source_name || "system",
    seo_score: article.seo_score ?? analysis.score,
    seo_analysis: analysis,
  };
}

// 🔹 HELPER: GET CATEGORY ID BY SLUG/NAME
function getCategoryId(categoryValue, callback) {
  if (!categoryValue) return callback(null, null);
  // If it's already a number, return it
  if (!isNaN(categoryValue)) return callback(null, parseInt(categoryValue, 10));

  const slug = String(categoryValue).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  db.query("SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1", [slug, categoryValue], (err, results) => {
    if (err) return callback(err, null);
    if (results && results.length > 0) return callback(null, results[0].id);

    // Auto-create category if not exists
    db.query("INSERT INTO categories (name, slug) VALUES (?, ?)", [categoryValue, slug], (insertErr, insertRes) => {
      if (insertErr) return callback(insertErr, null);
      return callback(null, insertRes.insertId);
    });
  });
}

// 🔹 HELPER: GET SOURCE ID
function getSourceId(sourceValue, callback) {
  if (!sourceValue) return callback(null, null);
  if (!isNaN(sourceValue)) return callback(null, parseInt(sourceValue, 10));

  db.query("SELECT id FROM sources WHERE name = ? LIMIT 1", [sourceValue], (err, results) => {
    if (err) return callback(err, null);
    if (results && results.length > 0) return callback(null, results[0].id);

    db.query("INSERT INTO sources (name, url) VALUES (?, ?)", [sourceValue, ''], (insertErr, insertRes) => {
      if (insertErr) return callback(insertErr, null);
      return callback(null, insertRes.insertId);
    });
  });
}

// 🔹 CREATE NEW ARTICLE
router.post("/articles", (req, res) => {
  const {
    title,
    content,
    summary,
    category_id,
    category,
    status,
    seo_title,
    meta_description,
    slug,
    keywords,
    image_url,
    image_alt,
    tags,
    source_id,
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

  const catVal = category_id || category;
  const srcVal = source_id || source;

  getCategoryId(catVal, (errCat, finalCategoryId) => {
    if (errCat) return res.status(500).json({ error: errCat.message });

    getSourceId(srcVal, (errSrc, finalSourceId) => {
      if (errSrc) return res.status(500).json({ error: errSrc.message });

      db.query(
        `INSERT INTO articles
          (title, content, summary, category_id, status, seo_title, meta_description, slug, keywords, image_url, image_alt, tags, source_id, seo_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          content,
          summary || "",
          finalCategoryId || null,
          status || "draft",
          seoData.seo_title,
          seoData.meta_description,
          seoData.slug,
          seoData.keywords,
          image_url || "",
          seoData.image_alt,
          typeof tags === "string" ? tags : JSON.stringify(tags || []),
          finalSourceId || null,
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
  });
});

// 🔹 GET ALL ARTICLES (admin use)
router.get("/articles", (req, res) => {
  db.query(
    `SELECT a.*, c.name as category_name, s.name as source_name 
     FROM articles a 
     LEFT JOIN categories c ON a.category_id = c.id 
     LEFT JOIN sources s ON a.source_id = s.id 
     ORDER BY a.created_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Error fetching articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json((results || []).map(withSeoMetrics));
    }
  );
});

// 🔹 GET PUBLISHED ARTICLES ONLY (public frontend)
// ⚠️ Must be ABOVE /articles/:id so Express doesn't match "published" as :id
router.get("/articles/published", (req, res) => {
  db.query(
    `SELECT a.*, c.name as category_name, s.name as source_name 
     FROM articles a 
     LEFT JOIN categories c ON a.category_id = c.id 
     LEFT JOIN sources s ON a.source_id = s.id 
     WHERE a.status='published' ORDER BY a.published_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Error fetching published articles:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json((results || []).map(withSeoMetrics));
    }
  );
});

// 🔹 TRACK ARTICLE VIEW
router.post("/articles/:id/view", (req, res) => {
  const articleId = req.params.id;
  const today = new Date().toISOString().slice(0, 10);

  // Increment total views on article
  db.query("UPDATE articles SET views = views + 1 WHERE id = ?", [articleId], (err) => {
    if (err) {
      console.error("Error incrementing views:", err);
      return res.status(500).json({ error: err.message });
    }

    // Upsert daily analytics
    db.query(
      `INSERT INTO analytics (article_id, view_date, views)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE views = views + 1`,
      [articleId, today],
      (analyticsErr) => {
        if (analyticsErr) {
          console.error("Error updating analytics:", analyticsErr);
        }
        res.json({ success: true, message: "View recorded" });
      }
    );
  });
});

// 🔹 GET SINGLE ARTICLE
router.get("/articles/:id", (req, res) => {
  db.query(
    `SELECT a.*, c.name as category_name, s.name as source_name 
     FROM articles a 
     LEFT JOIN categories c ON a.category_id = c.id 
     LEFT JOIN sources s ON a.source_id = s.id 
     WHERE a.id=?`,
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

// 🔹 GET ALL CATEGORIES
router.get("/categories", (req, res) => {
  db.query(
    "SELECT * FROM categories ORDER BY name ASC",
    (err, results) => {
      if (err) {
        console.error("Error fetching categories:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
    }
  );
});

// 🔹 GET ALL SOURCES
router.get("/sources", (req, res) => {
  db.query(
    "SELECT * FROM sources ORDER BY name ASC",
    (err, results) => {
      if (err) {
        console.error("Error fetching sources:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
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
    "UPDATE articles SET status='published', published_at=CURRENT_TIMESTAMP WHERE id=?",
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

// 🔹 EDIT ARTICLE 
router.put("/articles/:id", (req, res) => {
  const {
    title,
    content,
    summary,
    category_id,
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

  const catVal = category_id || category;

  getCategoryId(catVal, (errCat, finalCategoryId) => {
    if (errCat) return res.status(500).json({ error: errCat.message });

    db.query(
      "UPDATE articles SET title=?, content=?, summary=?, category_id=?, seo_title=?, meta_description=?, slug=?, keywords=?, image_url=?, image_alt=?, seo_score=? WHERE id=?",
      [
        title,
        content,
        summary || "",
        finalCategoryId || null,
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
});

// 🔹 DELETE ARTICLE
router.delete("/articles/:id", (req, res) => {
  db.query(
    "DELETE FROM articles WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("Error deleting article:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "Deleted 🗑️" });
    }
  );
});

module.exports = router;
