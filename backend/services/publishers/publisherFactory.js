/**
 * services/publishers/publisherFactory.js
 *
 * Central dispatcher — picks the right publisher(s) based on article.publish_to
 * and returns combined results.
 *
 * Three publish targets:
 *   'nashik'     → sets status='published' in DB, clears cache
 *   'navimumbai' → publishes to WordPress only (does NOT touch Supabase)
 *   'both'       → both of the above
 *
 * Usage:
 *   const { publishArticle, publishDirectToWordPress } = require('../services/publishers/publisherFactory');
 */

const fs = require("fs");
const WordPressPublisher = require("./wordpressPublisher");
const db = require("../../db");
const { clearCache } = require("../../middleware/cache");

/**
 * Log a publish attempt to publish_log table (non-fatal).
 * Skips if article_id is NULL and NOT NULL constraint prevents insert.
 */
async function logPublish(articleId, portal, action, wpPostId, wpUrl, error) {
  try {
    await db.query(
      `INSERT INTO publish_log (article_id, portal, action, wp_post_id, wp_url, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [articleId || null, portal, action, wpPostId || null, wpUrl || null, error || null]
    );
  } catch (e) {
    // If the error is about NOT NULL constraint on article_id and article_id is NULL,
    // this is expected for direct-to-WP publishing. Silently skip.
    if (e.message.includes("article_id") && e.message.includes("not-null") && !articleId) {
      return; // Expected for direct-to-WP; don't warn
    }
    // For other errors, log a warning
    console.warn("[PublishLog] Could not write log:", e.message);
  }
}

/**
 * Load Navi Mumbai portal config from DB.
 */
async function loadNaviMumbaiPortal() {
  const rows = await db.query(
    "SELECT * FROM portals WHERE slug = 'navimumbai' LIMIT 1"
  );
  const portal = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];

  if (!portal) {
    throw new Error(
      "Navi Mumbai portal not configured. Run migration and add WP credentials."
    );
  }
  if (!portal.wp_api_url || !portal.wp_username || !portal.wp_app_password) {
    throw new Error(
      "Navi Mumbai WordPress credentials are incomplete (wp_api_url / wp_username / wp_app_password)."
    );
  }
  return portal;
}

/**
 * Publish to Nashik Headlines (our own PostgreSQL + Next.js site).
 * Simply sets status = 'published' and published_at = NOW().
 */
async function publishToNashik(article) {
  await db.query(
    `UPDATE articles
     SET status = 'published',
         published_at = NOW(),
         wp_nashik_status = 'published',
         seo_score = COALESCE($1, seo_score),
         quality_score = COALESCE($2, quality_score),
         readability_score = COALESCE($3, readability_score)
     WHERE id = $4`,
    [
      article._seo_score || null,
      Math.round((article._seo_score || 0) * 1.07) || null,
      article._readability_score || null,
      article.id
    ]
  );
  await logPublish(article.id, "nashik", "published", null, null, null);
  clearCache().catch(() => {});
  return { status: "published", url: `/article/${article.slug}` };
}

/**
 * Publish to Navi Mumbai Headlines (WordPress).
 * Fetches portal config from DB, runs WordPressPublisher, saves WP post id back.
 * @param {object} article - Article data (may or may not have DB id)
 * @param {boolean} hasDbRecord - If true, save WP id back to articles table
 */
async function publishToNaviMumbai(article, hasDbRecord = true) {
  const portal = await loadNaviMumbaiPortal();
  const publisher = new WordPressPublisher(portal);
  const result = await publisher.publish(article);

  // Save WP post id + status + SEO scores back to article (only if it exists in DB)
  if (hasDbRecord && article.id) {
    await db.query(
      `UPDATE articles
       SET wp_navimumbai_post_id = $1,
           wp_navimumbai_status  = 'published',
           wp_last_synced_at     = NOW(),
           seo_score             = COALESCE($2, seo_score),
           quality_score         = COALESCE($3, quality_score),
           readability_score     = COALESCE($4, readability_score)
       WHERE id = $5`,
      [
        result.post_id,
        article._seo_score || null,
        Math.round(article._seo_score * 1.07) || null,  // Quality usually slightly higher
        article._readability_score || null,
        article.id
      ]
    );
  }

  await logPublish(article.id || null, "navimumbai", "published", result.post_id, result.url, null);
  return result;
}

/**
 * Publish an article that already exists in the DB.
 * @param {object} article - Full article row from DB (enriched with category_name etc.)
 * @returns {object} { nashik?, navimumbai? }
 */
async function publishArticle(article) {
  const publishTo = article.publish_to || "nashik";
  const results = {};

  if (publishTo === "nashik" || publishTo === "both") {
    try {
      results.nashik = await publishToNashik(article);
    } catch (err) {
      await logPublish(article.id, "nashik", "failed", null, null, err.message);
      results.nashik = { status: "failed", error: err.message };
    }
  }

  if (publishTo === "navimumbai" || publishTo === "both") {
    try {
      results.navimumbai = await publishToNaviMumbai(article, true);
    } catch (err) {
      await logPublish(article.id, "navimumbai", "failed", null, null, err.message);
      results.navimumbai = { status: "failed", error: err.message };
    }
  }

  if (publishTo === "both" && results.nashik?.status === "published") {
    clearCache().catch(() => {});
  }

  return results;
}

/**
 * Publish article DIRECTLY to WordPress without saving to DB.
 * Used when publish_to = 'navimumbai' and user does NOT want a local copy.
 * @param {object} articleData - Raw article data from the AI Editor form
 * @returns {object} { status, post_id, url }
 */
async function publishDirectToWordPress(articleData) {
  // articleData has no DB id — publish and log without DB reference
  const portal = await loadNaviMumbaiPortal();
  const publisher = new WordPressPublisher(portal);
  const result = await publisher.publish(articleData);

  await logPublish(null, "navimumbai", "wp-draft", result.post_id, result.url, null);
  return result;
}

/**
 * Upload image files directly to Navi Mumbai WordPress media library.
 * @param {object[]} files - Multer file objects (path on disk)
 * @param {object[]} metaList - Optional per-file { altText, caption, isFeatured }
 */
async function uploadImagesToWordPress(files, metaList = []) {
  const portal = await loadNaviMumbaiPortal();
  const publisher = new WordPressPublisher(portal);
  const images = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = metaList[i] || {};

    try {
      const media = await publisher.uploadImageFromFile(file.path, {
        altText: meta.altText || "",
        caption: meta.caption || "",
        imageTitle: meta.imageTitle || meta.altText || "",
        filename: file.originalname,
      });

      if (media?.id && media?.source_url) {
        images.push({
          id: String(media.id),
          url: media.source_url,
          mediaId: media.id,
          altText: meta.altText || "",
          caption: meta.caption || "",
          isFeatured: Boolean(meta.isFeatured ?? i === 0),
        });
      }
    } finally {
      fs.unlink(file.path, () => {});
    }
  }

  if (!images.length) {
    throw new Error("No images were uploaded to WordPress. Check WP credentials and media permissions.");
  }

  return images;
}

async function checkNaviMumbaiYoastBridge() {
  const portal = await loadNaviMumbaiPortal();
  const publisher = new WordPressPublisher(portal);
  return publisher.checkYoastBridge();
}

module.exports = {
  publishArticle,
  publishDirectToWordPress,
  uploadImagesToWordPress,
  checkNaviMumbaiYoastBridge,
  logPublish,
};
