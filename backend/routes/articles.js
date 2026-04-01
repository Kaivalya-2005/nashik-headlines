const express = require("express");
const router = express.Router();
const db = require("../db");
const { buildSeoPayload, calculateSeoScore } = require("../services/seo");
const { adminAuth } = require("../middleware/auth");
const { improve } = require("../services/aiPipeline/improveAgent");
const { categorize } = require("../services/aiPipeline/categoryAgent");
const { generateSeo } = require("../services/aiPipeline/seoAgent");
const { checkQuality } = require("../services/aiPipeline/qualityAgent");
const { cacheMiddleware, clearCache } = require("../middleware/cache");

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
router.post("/articles", async (req, res) => {
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

  try {
    const qualityData = await checkQuality(title, content);
    const quality_score = Math.round(
      qualityData.ai_confidence * 0.5 +
      qualityData.readability_score * 0.3 +
      seoData.seo_score * 0.2
    );

    getCategoryId(catVal, (errCat, finalCategoryId) => {
      if (errCat) return res.status(500).json({ error: errCat.message });

      getSourceId(srcVal, (errSrc, finalSourceId) => {
        if (errSrc) return res.status(500).json({ error: errSrc.message });

        db.query(
          `INSERT INTO articles
            (title, content, summary, category_id, status, seo_title, meta_description, slug, keywords, image_url, image_alt, tags, source_id, seo_score, quality_score, readability_score, ai_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            quality_score,
            qualityData.readability_score,
            qualityData.ai_confidence
          ],
          (err, result) => {
            if (err) {
              console.error("Error creating article:", err);
              return res.status(500).json({ error: err.message });
            }
            clearCache().catch(console.error);
            res.status(201).json({
              success: true,
              id: result.insertId,
              message: "Article created",
              seo_score: seoData.seo_score,
              quality_score,
              readability_score: qualityData.readability_score,
              ai_confidence: qualityData.ai_confidence
            });
          }
        );
      });
    });
  } catch (err) {
    console.error("Quality check failed in POST /articles:", err);
    return res.status(500).json({ error: "Quality check failed" });
  }
});

// 🔹 GET ALL ARTICLES (admin use)
router.get("/articles", (req, res) => {
  const category = req.query.category;

  let query = `SELECT a.*, c.name as category_name, c.slug as category_slug, s.name as source_name 
               FROM articles a 
               LEFT JOIN categories c ON a.category_id = c.id 
               LEFT JOIN sources s ON a.source_id = s.id`;
  const params = [];

  if (category) {
    query += ` WHERE c.slug = ?`;
    params.push(category);
  }

  query += ` ORDER BY a.created_at DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching articles:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json((results || []).map(withSeoMetrics));
  });
});

// 🔹 GET PUBLISHED ARTICLES ONLY (public frontend)
// ⚠️ Must be ABOVE /articles/:id so Express doesn't match "published" as :id
router.get("/articles/published", cacheMiddleware(300), (req, res) => {
  const category = req.query.category;
  
  let query = `SELECT a.*, c.name as category_name, c.slug as category_slug, s.name as source_name 
               FROM articles a 
               LEFT JOIN categories c ON a.category_id = c.id 
               LEFT JOIN sources s ON a.source_id = s.id 
               WHERE a.status='published'`;
  const params = [];

  if (category) {
    query += ` AND c.slug = ?`;
    params.push(category);
  }

  query += ` ORDER BY a.published_at DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching published articles:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json((results || []).map(withSeoMetrics));
  });
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
router.get("/categories", cacheMiddleware(3600), (req, res) => {
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
router.get("/sources", cacheMiddleware(3600), (req, res) => {
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
      clearCache().catch(console.error);
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
      clearCache().catch(console.error);
      res.json({ success: true, message: "Published 🚀" });
    }
  );
});

// Rate limiting state
let activeImprovements = 0;
const MAX_CONCURRENT_IMPROVEMENTS = 2;

// 🔹 REGENERATE ARTICLE (Preview Only)
router.post("/articles/regenerate", adminAuth, async (req, res) => {
  if (activeImprovements >= MAX_CONCURRENT_IMPROVEMENTS) {
    return res.status(429).json({ error: "AI processing queue is busy, please try again." });
  }

  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required for regeneration" });
  }

  activeImprovements++;

  try {
    // 1. Run improveAgent
    let improvedData;
    try {
      improvedData = await improve(title, content);
    } catch (aiErr) {
      return res.status(500).json({ error: `AI Improvement failed: ${aiErr.message}` });
    }

    // 2. Run other agents on the new content
    const categorized = await categorize(improvedData.improved_title, improvedData.improved_content);
    const seoData = await generateSeo(improvedData.improved_title, improvedData.improved_content, categorized.category);
    const qualityData = await checkQuality(improvedData.improved_title, improvedData.improved_content);

    const quality_score = Math.round(
      qualityData.ai_confidence * 0.50 +
      qualityData.readability_score * 0.30 +
      seoData.seo_score * 0.20
    );

    // 3. Return the regenerated data (do not save to DB)
    return res.json({
      title: improvedData.improved_title,
      content: improvedData.improved_content,
      category: categorized.category,
      seo_title: seoData.seo_title,
      meta_description: seoData.meta_description,
      keywords: seoData.keywords,
      slug: seoData.slug,
      seo_score: seoData.seo_score,
      quality_score,
      readability_score: qualityData.readability_score,
      ai_confidence: qualityData.ai_confidence
    });
  } catch (err) {
    console.error("Regeneration flow error:", err);
    res.status(500).json({ error: "Internal error during regeneration" });
  } finally {
    activeImprovements--;
  }
});

// 🔹 IMPROVE ARTICLE (DB Update)
router.post("/articles/:id/improve", adminAuth, async (req, res) => {
  if (activeImprovements >= MAX_CONCURRENT_IMPROVEMENTS) {
    return res.status(429).json({ error: "AI processing queue is busy, please try again." });
  }

  activeImprovements++;

  try {
    const articleId = req.params.id;

    // 1. Fetch article
    const results = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM articles WHERE id = ?", [articleId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    const oldArticle = results[0];

    // 2. Run improveAgent
    let improvedData;
    try {
      improvedData = await improve(oldArticle.title, oldArticle.content);
    } catch (aiErr) {
      return res.status(500).json({ error: `AI Improvement failed: ${aiErr.message}` });
    }

    // 3. Check similarity
    if (improvedData.isSimilar) {
      return res.json({ message: "No significant improvement detected" });
    }

    // 4. Run other agents
    const categorized = await categorize(improvedData.improved_title, improvedData.improved_content);
    const seoData = await generateSeo(improvedData.improved_title, improvedData.improved_content, categorized.category);
    const qualityData = await checkQuality(improvedData.improved_title, improvedData.improved_content);

    const quality_score = Math.round(
      qualityData.ai_confidence * 0.50 +
      qualityData.readability_score * 0.30 +
      seoData.seo_score * 0.20
    );

    // 5. Save revision
    await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO article_revisions 
        (article_id, title, content, seo_title, meta_description, keywords, slug, seo_score, quality_score, readability_score, ai_confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          oldArticle.id, oldArticle.title, oldArticle.content,
          oldArticle.seo_title, oldArticle.meta_description, oldArticle.keywords,
          oldArticle.slug, oldArticle.seo_score, oldArticle.quality_score,
          oldArticle.readability_score, oldArticle.ai_confidence
        ],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Log revision step
    await new Promise((resolve) => {
      db.query("INSERT INTO logs (step, message, status) VALUES (?, ?, ?)",
        ["article_revision_saved", `Revision saved for article #${articleId}`, "info"],
        () => resolve()
      );
    });

    // 6. Update document
    await new Promise((resolve, reject) => {
      db.query(
        `UPDATE articles SET 
          title=?, content=?, seo_title=?, meta_description=?, keywords=?, 
          slug=?, seo_score=?, quality_score=?, readability_score=?, ai_confidence=?
         WHERE id=?`,
        [
          improvedData.improved_title, improvedData.improved_content,
          seoData.seo_title, seoData.meta_description, seoData.keywords,
          seoData.slug, seoData.seo_score, quality_score,
          qualityData.readability_score, qualityData.ai_confidence,
          articleId
        ],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Log quality improved
    await new Promise((resolve) => {
      db.query("INSERT INTO logs (step, message, status) VALUES (?, ?, ?)",
        ["article_quality_improved", `Article #${articleId} improved. Quality Score: ${quality_score}`, "info"],
        () => resolve()
      );
    });

    clearCache().catch(console.error);
    
    return res.json({
      success: true,
      message: "Article improved successfully",
      new_scores: {
        seo_score: seoData.seo_score,
        quality_score,
        readability_score: qualityData.readability_score,
        ai_confidence: qualityData.ai_confidence
      }
    });

  } catch (err) {
    console.error("Improvement flow error:", err);
    res.status(500).json({ error: "Database or internal error during improvement" });
  } finally {
    activeImprovements--;
  }
});

// 🔹 EDIT ARTICLE 
router.put("/articles/:id", async (req, res) => {
  const {
    title,
    content,
    summary,
    category_id,
    category,
    tags,
    // Accept both flat fields and nested seo object (from frontend)
    seo_title: flat_seo_title,
    meta_description: flat_meta_description,
    slug,
    keywords: flat_keywords,
    image_url,
    image_alt,
    seo,
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  // Support both { seo_title, meta_description } (flat) and { seo: { metaTitle, metaDescription } } (nested)
  const seo_title       = flat_seo_title       || seo?.metaTitle        || '';
  const meta_description = flat_meta_description || seo?.metaDescription  || '';
  const keywords        = flat_keywords         || (seo?.keywords ? (Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords) : '');

  // Serialize tags
  const tagsValue = Array.isArray(tags)
    ? tags.join(', ')
    : (typeof tags === 'string' ? tags : '');

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

  try {
    const qualityData = await checkQuality(title, content);
    const quality_score = Math.round(
      qualityData.ai_confidence * 0.5 +
      qualityData.readability_score * 0.3 +
      seoData.seo_score * 0.2
    );

    getCategoryId(catVal, (errCat, finalCategoryId) => {
      if (errCat) return res.status(500).json({ error: errCat.message });

      db.query(
        "UPDATE articles SET title=?, content=?, summary=?, category_id=?, tags=?, seo_title=?, meta_description=?, slug=?, keywords=?, image_url=?, image_alt=?, seo_score=?, quality_score=?, readability_score=?, ai_confidence=? WHERE id=?",
        [
          title,
          content,
          summary || "",
          finalCategoryId || null,
          tagsValue,
          seoData.seo_title,
          seoData.meta_description,
          seoData.slug,
          seoData.keywords,
          image_url || "",
          seoData.image_alt,
          seoData.seo_score,
          quality_score,
          qualityData.readability_score,
          qualityData.ai_confidence,
          req.params.id,
        ],
        (err) => {
          if (err) {
            console.error("Error updating article:", err);
            return res.status(500).json({ error: err.message });
          }
          // Return the updated article so the frontend can reflect the saved state
          db.query(
            `SELECT a.*, c.name as category_name, s.name as source_name 
            FROM articles a 
            LEFT JOIN categories c ON a.category_id = c.id 
            LEFT JOIN sources s ON a.source_id = s.id 
            WHERE a.id=?`,
            [req.params.id],
            (err2, rows) => {
              clearCache().catch(console.error);
              if (err2 || !rows || rows.length === 0) {
                return res.json({ success: true, message: "Updated ✏️", seo_score: seoData.seo_score, quality_score, readability_score: qualityData.readability_score, ai_confidence: qualityData.ai_confidence });
              }
              res.json({ ...withSeoMetrics(rows[0]), success: true });
            }
          );
        }
      );
    });
  } catch (err) {
    console.error("Quality check failed in PUT /articles/:id:", err);
    return res.status(500).json({ error: "Quality check failed" });
  }
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
      clearCache().catch(console.error);
      res.json({ success: true, message: "Deleted 🗑️" });
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 RAW ARTICLES ROUTES (scraped, unprocessed)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/raw-articles — all scraped articles
router.get("/raw-articles", (req, res) => {
  db.query(
    "SELECT * FROM raw_articles ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results || []);
    }
  );
});

// GET /api/raw-articles/pending — only pending ones
router.get("/raw-articles/pending", (req, res) => {
  db.query(
    "SELECT * FROM raw_articles WHERE status='pending' ORDER BY created_at ASC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results || []);
    }
  );
});

// DELETE /api/raw-articles/:id
router.delete("/raw-articles/:id", (req, res) => {
  db.query(
    "DELETE FROM raw_articles WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Raw article deleted 🗑️" });
    }
  );
});

// POST /api/raw-articles/:id/process — trigger single-article pipeline
// (thin proxy — delegates to the pipeline route handler)
router.post("/raw-articles/:id/process", async (req, res) => {
  try {
    const axios = require("axios");
    const response = await axios.post(
      `http://localhost:${process.env.PORT || 5000}/api/pipeline/process/${req.params.id}`
    );
    res.json(response.data);
  } catch (err) {
    const data = err.response?.data;
    const status = err.response?.status || 500;
    res.status(status).json(data || { error: err.message });
  }
});

module.exports = router;
