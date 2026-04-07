const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const multer = require("multer");
const { buildSeoPayload, calculateSeoScore } = require("../services/seo");
const { adminAuth } = require("../middleware/auth");
const { improve } = require("../services/aiPipeline/improveAgent");
const { categorize } = require("../services/aiPipeline/categoryAgent");
const { generateSeo } = require("../services/aiPipeline/seoAgent");
const { checkQuality } = require("../services/aiPipeline/qualityAgent");
const { cacheMiddleware, clearCache } = require("../middleware/cache");
const { uploadImages } = require("../services/cloudinaryService");

const sanitizeMediaUrl = (value = "") => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return "";
  return url;
};

const normalizeImageRecord = (image, idx = 0, articleId = null) => {
  if (!image) return null;

  if (typeof image === "string") {
    const normalizedUrl = sanitizeMediaUrl(image);
    if (!normalizedUrl) return null;
    return {
      id: `${articleId || "article"}-${idx}`,
      url: normalizedUrl,
      publicId: "",
      caption: "",
      altText: "",
      isFeatured: idx === 0,
    };
  }

  const url = sanitizeMediaUrl(image.url || image.secure_url || image.image_url || "");
  if (!url) return null;

  return {
    id: image.id || `${articleId || "article"}-${idx}`,
    url,
    publicId: image.publicId || image.public_id || "",
    caption: image.caption || "",
    altText: image.altText || image.alt_text || "",
    isFeatured: Boolean(image.isFeatured ?? image.is_featured ?? idx === 0),
  };
};

const parseArticleImages = (images, articleId = null) => {
  if (!images) return [];

  let list = images;
  if (typeof images === "string") {
    try {
      list = JSON.parse(images);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(list)) return [];

  return list
    .map((image, idx) => normalizeImageRecord(image, idx, articleId))
    .filter(Boolean)
    .map((image, idx) => ({
      ...image,
      isFeatured: idx === 0 ? true : image.isFeatured,
    }));
};

const serializeArticleImages = (images, articleId = null) => JSON.stringify(parseArticleImages(images, articleId));

const normalizeArticle = (article) => ({
  ...article,
  images: parseArticleImages(article?.images, article?.id),
});

const ensureArticleImagesColumn = async () => {
  try {
    await db.query("ALTER TABLE articles ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb");
    await db.query("UPDATE articles SET images = '[]'::jsonb WHERE images IS NULL");
  } catch (error) {
    console.error("Failed to ensure articles.images column exists:", error.message);
  }
};

ensureArticleImagesColumn().catch((error) => {
  console.error("Failed to initialize article image storage:", error.message);
});

// Multer config: save images to /uploads, unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `article-${req.params.id || Date.now()}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP files are allowed"));
    }
  },
});

function withSeoMetrics(article) {
  const analysis = calculateSeoScore(article);
  return {
    ...normalizeArticle(article),
    category: article.category_name || "Uncategorized",
    source: article.source_name || "system",
    seo_score: analysis.score,
    seo_score_stored: article.seo_score ?? null,
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
    images,
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
  const parsedImages = parseArticleImages(images);
  const imagesValue = JSON.stringify(parsedImages);
  const featuredImage = parsedImages.find((img) => img.isFeatured) || parsedImages[0] || null;
  const normalizedImageUrl = sanitizeMediaUrl(image_url) || featuredImage?.url || "";

  try {
    let qualityData;
    try {
      qualityData = await checkQuality(title, content);
    } catch (qualityErr) {
      console.error("Quality check failed in POST /articles, using fallback:", qualityErr.message);
      qualityData = {
        readability_score: 70,
        ai_confidence: 70,
      };
    }

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
            (title, content, summary, category_id, status, seo_title, meta_description, slug, keywords, image_url, image_alt, tags, images, source_id, seo_score, quality_score, readability_score, ai_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            normalizedImageUrl,
            seoData.image_alt,
            typeof tags === "string" ? tags : JSON.stringify(tags || []),
            imagesValue,
            finalSourceId || null,
            seoData.seo_score,
            quality_score,
            qualityData.readability_score,
            qualityData.ai_confidence
          ],
          (err, result) => {
            if (err) {
              console.error("Error creating article:", err);
              if (err.code === "23505") {
                return res.status(409).json({ error: "An article with this slug already exists. Please change the title or slug." });
              }
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

// 🔹 GET SINGLE ARTICLE
router.get("/articles/:id", (req, res) => {
  const articleId = req.params.id;

  db.query(
    `SELECT a.*, c.name as category_name, c.slug as category_slug, s.name as source_name 
     FROM articles a 
     LEFT JOIN categories c ON a.category_id = c.id 
     LEFT JOIN sources s ON a.source_id = s.id 
     WHERE a.id = ? OR a.slug = ?
     LIMIT 1`,
    [articleId, articleId],
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
    images,
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
  const parsedImages = parseArticleImages(images, req.params.id);
  const imagesValue = JSON.stringify(parsedImages);
  const featuredImage = parsedImages.find((img) => img.isFeatured) || parsedImages[0] || null;
  const normalizedImageUrl = sanitizeMediaUrl(image_url) || featuredImage?.url || "";

  try {
    let qualityData;
    try {
      qualityData = await checkQuality(title, content);
    } catch (qualityErr) {
      console.error("Quality check failed in PUT /articles/:id, using fallback:", qualityErr.message);
      qualityData = {
        readability_score: 70,
        ai_confidence: 70,
      };
    }

    const quality_score = Math.round(
      qualityData.ai_confidence * 0.5 +
      qualityData.readability_score * 0.3 +
      seoData.seo_score * 0.2
    );

    getCategoryId(catVal, (errCat, finalCategoryId) => {
      if (errCat) return res.status(500).json({ error: errCat.message });

      db.query(
        "UPDATE articles SET title=?, content=?, summary=?, category_id=?, tags=?, seo_title=?, meta_description=?, slug=?, keywords=?, image_url=?, image_alt=?, images=?, seo_score=?, quality_score=?, readability_score=?, ai_confidence=? WHERE id=?",
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
          normalizedImageUrl,
          seoData.image_alt,
          imagesValue,
          seoData.seo_score,
          quality_score,
          qualityData.readability_score,
          qualityData.ai_confidence,
          req.params.id,
        ],
        (err) => {
          if (err) {
            console.error("Error updating article:", err);
            if (err.code === "23505") {
              return res.status(409).json({ error: "Slug already in use by another article. Please use a different slug." });
            }
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
    console.error("Error in PUT /articles/:id:", err);
    return res.status(500).json({ error: "Failed to update article" });
  }
});

// 🔹 UPLOAD IMAGES FOR ARTICLE
router.post("/articles/:id/images", upload.array("images", 5), async (req, res) => {
  const articleId = req.params.id;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No image files uploaded" });
  }

  try {
    // Upload images to Cloudinary
    const cloudinaryResults = await uploadImages(req.files);

    const uploadedImages = cloudinaryResults.map((result, idx) => ({
      id: `${articleId}-${Date.now()}-${idx}`,
      url: result.secure_url,
      publicId: result.public_id,
      caption: "",
      altText: "",
      isFeatured: idx === 0,
    }));

    // Update article image_url with the first (featured) image
    const featuredUrl = uploadedImages.find(i => i.isFeatured)?.url || "";
    db.query("SELECT images FROM articles WHERE id = ?", [articleId], (selectErr, rows) => {
      if (selectErr) {
        console.error("Could not read existing images:", selectErr);
      }

      const existingImages = parseArticleImages(rows?.[0]?.images, articleId);
      const mergedImages = [...existingImages, ...uploadedImages];

      db.query("UPDATE articles SET image_url = ?, images = ? WHERE id = ?", [featuredUrl, JSON.stringify(mergedImages), articleId], (err) => {
        if (err) console.error("Could not update image_url/images:", err);
      });
    });

    clearCache().catch(console.error);
    res.json({ success: true, images: uploadedImages });
  } catch (error) {
    console.error("Image upload to Cloudinary failed:", error);
    return res.status(500).json({ error: "Image upload failed", details: error.message });
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
