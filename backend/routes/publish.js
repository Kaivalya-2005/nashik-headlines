/**
 * routes/publish.js
 *
 * Publishing endpoints:
 *   POST  /api/publish/:id          — publish article to one or both portals
 *   PUT   /api/articles/:id/schedule — schedule article for future publish
 *   GET   /api/publish/log/:id       — get publish history for an article
 *   GET   /api/portals               — list portals
 *   PUT   /api/portals/:id           — save WP credentials for a portal
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const db = require("../db");
const { adminAuth } = require("../middleware/auth");
const {
  publishArticle,
  publishDirectToWordPress,
  uploadImagesToWordPress,
  checkNaviMumbaiYoastBridge,
} = require("../services/publishers/publisherFactory");
const { clearCache } = require("../middleware/cache");

const uploadsDir = path.join(__dirname, "../uploads");
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.warn("[publish] Could not create uploads dir:", e.message);
}

const publishUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `publish-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP files are allowed"));
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/publish/yoast-check — verify Yoast mu-plugin on Navi Mumbai WP
// ─────────────────────────────────────────────────────────────────────────────
router.get("/publish/yoast-check", adminAuth, async (_req, res) => {
  try {
    const result = await checkNaviMumbaiYoastBridge();
    return res.status(result.ok ? 200 : 503).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/publish/upload-images
// Upload images directly to Navi Mumbai WordPress media (no Cloudinary, no DB).
// Optional body field "meta": JSON array [{ altText, caption, isFeatured }, ...]
// ─────────────────────────────────────────────────────────────────────────────
router.post("/publish/upload-images", adminAuth, publishUpload.array("images", 4), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No image files uploaded" });
    }

    let metaList = [];
    if (req.body?.meta) {
      try {
        metaList = JSON.parse(req.body.meta);
        if (!Array.isArray(metaList)) metaList = [];
      } catch {
        metaList = [];
      }
    }

    const images = await uploadImagesToWordPress(req.files, metaList);
    return res.json({ success: true, images });
  } catch (err) {
    console.error("[POST /publish/upload-images]", err);
    return res.status(500).json({ error: err.message || "WordPress image upload failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/publish/direct-to-wp
// Publishes article data DIRECTLY to Navi Mumbai WordPress — no DB record saved.
// Body: { title, content, excerpt, summary, category, tags, slug, seo_title,
//         meta_description, focus_keyword, og_title, og_description, og_image,
//         twitter_title, twitter_description, featured_image_url, featured_image_alt,
//         canonical_url, format, sticky, language }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/publish/direct-to-wp", adminAuth, async (req, res) => {
  try {
    const articleData = req.body;
    if (!articleData.title || !articleData.content) {
      return res.status(400).json({ error: "title and content are required" });
    }

    const result = await publishDirectToWordPress(articleData);

    return res.status(200).json({
      success: true,
      message: "Saved as WordPress draft on Navi Mumbai Headlines ✅",
      post_id: result.post_id,
      url:     result.url,
      status:  result.status || "draft",
    });
  } catch (err) {
    console.error("[POST /publish/direct-to-wp]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: fetch full article row (with joins) by id
// ─────────────────────────────────────────────────────────────────────────────
async function getFullArticle(id) {
  const rows = await db.query(
    `SELECT a.*,
            c.name  AS category_name,
            c.slug  AS category_slug,
            s.name  AS source_name
     FROM   articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN sources    s ON a.source_id    = s.id
     WHERE  a.id = $1
     LIMIT  1`,
    [id]
  );
  // db.query returns rows array directly for SELECT
  return Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/publish/:id
// Body (optional): { publish_to: 'nashik' | 'navimumbai' | 'both' }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/publish/:id", adminAuth, async (req, res) => {
  const articleId = req.params.id;
  const overrideTarget = req.body?.publish_to;

  try {
    const article = await getFullArticle(articleId);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Allow overriding publish_to from request body
    if (overrideTarget) {
      article.publish_to = overrideTarget;
      // Also persist the override
      await db.query(
        "UPDATE articles SET publish_to = $1 WHERE id = $2",
        [overrideTarget, articleId]
      );
    }

    const results = await publishArticle(article);

    const overallSuccess = Object.values(results).some(
      (r) => r.status === "published"
    );

    return res.status(overallSuccess ? 200 : 207).json({
      success: overallSuccess,
      article_id: articleId,
      results,
    });
  } catch (err) {
    console.error("[POST /publish/:id]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/articles/:id/schedule
// Body: { scheduled_at: ISO string, publish_to: '...' }
// ─────────────────────────────────────────────────────────────────────────────
router.put("/articles/:id/schedule", adminAuth, async (req, res) => {
  const { scheduled_at, publish_to } = req.body;
  if (!scheduled_at) {
    return res.status(400).json({ error: "scheduled_at is required" });
  }

  try {
    await db.query(
      `UPDATE articles
       SET status       = 'scheduled',
           scheduled_at = $1,
           publish_to   = COALESCE($2, publish_to)
       WHERE id = $3`,
      [scheduled_at, publish_to || null, req.params.id]
    );
    clearCache().catch(() => {});
    return res.json({ success: true, message: "Article scheduled ⏰", scheduled_at });
  } catch (err) {
    console.error("[PUT /articles/:id/schedule]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/publish/log/:id — publish history for an article
// ─────────────────────────────────────────────────────────────────────────────
router.get("/publish/log/:id", adminAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM publish_log WHERE article_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    return res.json(Array.isArray(rows) ? rows : rows?.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portals — list all portals
// ─────────────────────────────────────────────────────────────────────────────
router.get("/portals", adminAuth, async (req, res) => {
  try {
    const rows = await db.query("SELECT id, slug, name, wp_api_url, wp_username, active FROM portals ORDER BY id");
    return res.json(Array.isArray(rows) ? rows : rows?.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/portals/:id — save WP credentials
// Body: { wp_api_url, wp_username, wp_app_password, active }
// ─────────────────────────────────────────────────────────────────────────────
router.put("/portals/:id", adminAuth, async (req, res) => {
  const { wp_api_url, wp_username, wp_app_password, active } = req.body;
  try {
    await db.query(
      `UPDATE portals
       SET wp_api_url      = COALESCE($1, wp_api_url),
           wp_username     = COALESCE($2, wp_username),
           wp_app_password = COALESCE($3, wp_app_password),
           active          = COALESCE($4, active)
       WHERE id = $5`,
      [wp_api_url, wp_username, wp_app_password, active, req.params.id]
    );
    return res.json({ success: true, message: "Portal updated ✅" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/portals/test — test WP connection
// Body: { portal_id }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/portals/test", adminAuth, async (req, res) => {
  const { portal_id } = req.body;
  try {
    const rows = await db.query("SELECT * FROM portals WHERE id = $1", [portal_id]);
    const portal = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!portal) return res.status(404).json({ error: "Portal not found" });

    if (!portal.wp_api_url) {
      return res.status(400).json({ error: "wp_api_url not set for this portal" });
    }

    const axios = require("axios");
    const { data } = await axios.get(`${portal.wp_api_url.replace(/\/$/, "")}/posts?per_page=1`, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${portal.wp_username}:${portal.wp_app_password}`).toString("base64"),
      },
      timeout: 10000,
    });

    return res.json({
      success: true,
      message: "WordPress connection successful ✅",
      posts_endpoint_ok: true,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `WordPress connection failed: ${err.message}`,
    });
  }
});

module.exports = router;
