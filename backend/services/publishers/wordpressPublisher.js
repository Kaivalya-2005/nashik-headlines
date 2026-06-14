/**
 * services/publishers/wordpressPublisher.js
 *
 * Publishes articles to WordPress via REST API.
 * Uses Application Passwords (no OAuth needed).
 *
 * ARCHITECTURE:
 *   Content arrives as pre-rendered HTML from htmlRenderer.js
 *   → No markdown conversion needed
 *   → No image injection here (renderer handles it)
 *   → This module only: uploads images, builds payload, publishes, sets Yoast meta
 *
 * YOAST SEO meta keys use HYPHENS for OG/Twitter:
 *   _yoast_wpseo_opengraph-title, _yoast_wpseo_twitter-title, etc.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { runPrePublishPipeline } = require("../aiPipeline/prePubPipeline");
const { renderArticleHtml, injectImagesIntoHtml, generateImageSeo, isMarathiText } = require("../content/htmlRenderer");

function normalizeText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function resolveFocusKeyword(article = {}) {
  const explicit = normalizeText(article.focus_keyword);
  if (explicit && explicit.split(/\s+/).filter(Boolean).length >= 2) return explicit;

  const candidates = [article.keywords, article.tags];
  for (const candidate of candidates) {
    const parts = String(candidate || "")
      .split(",")
      .map((part) => normalizeText(part))
      .filter(Boolean);
    const valid = parts.find((part) => part.split(/\s+/).filter(Boolean).length >= 2);
    if (valid) return valid;
  }

  const title = normalizeText(article.seo_title || article.title || "");
  if (!title) return "";
  return title.split(/\s+/).slice(0, 3).join(" ");
}

function imageAltMatchesKeyword(altText = "", focusKeyword = "") {
  const kwWords = normalizeText(focusKeyword).toLowerCase().split(/\s+/).filter(Boolean);
  if (!kwWords.length) return true;
  const alt = normalizeText(altText).toLowerCase();
  const matched = kwWords.filter((word) => alt.includes(word));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

function ensureAltText(altText, focusKeyword, fallback = "") {
  const kw = normalizeText(focusKeyword);
  const alt = normalizeText(altText || fallback);
  if (!kw) return alt;
  if (imageAltMatchesKeyword(alt, kw)) return alt;
  return `${kw} — ${alt || fallback || "Latest news update"}`.slice(0, 120);
}

class WordPressPublisher {
  constructor(portal) {
    this.portal = portal;
    this.baseUrl = (portal.wp_api_url || "").replace(/\/$/, "");
    this.authHeader =
      "Basic " +
      Buffer.from(`${portal.wp_username}:${portal.wp_app_password}`).toString("base64");
  }

  get headers() {
    return {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
    };
  }

  /** Site root for custom REST routes (nmh/v1). */
  get siteApiBase() {
    return this.baseUrl.replace(/\/wp\/v2\/?$/, "");
  }

  /** Ping Yoast mu-plugin — GET /wp-json/nmh/v1/ping */
  async checkYoastBridge() {
    try {
      const { data } = await axios.get(`${this.siteApiBase}/nmh/v1/ping`, {
        headers: { Authorization: this.authHeader },
        timeout: 10000,
      });
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        status: err?.response?.status,
        error: err.message,
        install:
          "Upload backend/wordpress-plugin/yoast-rest-api-bridge.php to /wp-content/mu-plugins/ on WordPress",
      };
    }
  }

  buildYoastMeta(article, primaryMediaId = null) {
    const seoTitle = (article.seo_title || article.title || "").trim();
    const seoDesc = (article.meta_description || article.og_description || "").trim();
    const focusKw = resolveFocusKeyword(article);
    const ogTitle = (article.og_title || seoTitle).trim();
    const ogDesc = (article.og_description || seoDesc).trim();
    const twTitle = (article.twitter_title || ogTitle).trim();
    const twDesc = (article.twitter_description || ogDesc).trim();
    const ogImage = article.og_image || article.featured_image_url || article.image_url || "";

    // Estimate reading time: avg 200 Marathi words/minute
    const wc = Number(article._word_count || 0) ||
      String(article.content || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.round(wc / 200));

    const meta = {
      "_yoast_wpseo_focuskw": focusKw,
      "_yoast_wpseo_title": seoTitle,
      "_yoast_wpseo_metadesc": seoDesc,
      "_yoast_wpseo_canonical": article.canonical_url || "",
      "_yoast_wpseo_opengraph-title": ogTitle,
      "_yoast_wpseo_opengraph-description": ogDesc,
      "_yoast_wpseo_opengraph-image": ogImage,
      "_yoast_wpseo_twitter-title": twTitle,
      "_yoast_wpseo_twitter-description": twDesc,
      "_yoast_wpseo_twitter-image": ogImage,
      "_yoast_wpseo_meta-robots-noindex": "0",
      "_yoast_wpseo_meta-robots-nofollow": "0",
      "_yoast_wpseo_estimated-reading-time-minutes": String(readingMinutes),
    };

    if (primaryMediaId) {
      meta["_yoast_wpseo_opengraph-image-id"] = String(primaryMediaId);
    }

    return meta;
  }

  /**
   * Upload a local file directly to the WP media library (no Cloudinary).
   */
  async uploadImageFromFile(filePath, opts = {}) {
    const {
      altText = "",
      caption = "",
      imageTitle = "",
      description = "",
      filename: originalName = "",
    } = opts;

    if (!filePath || !fs.existsSync(filePath)) return null;

    const ext = path.extname(originalName || filePath).toLowerCase() || ".jpg";
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const contentType = mimeMap[ext] || "image/jpeg";
    const safeName = (originalName || path.basename(filePath)).replace(/[^\w.\-]/g, "_");

    try {
      const buffer = fs.readFileSync(filePath);
      const { data } = await axios.post(`${this.baseUrl}/media`, buffer, {
        headers: {
          Authorization: this.authHeader,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Content-Type": contentType,
        },
        timeout: 40000,
      });

      if (data?.id) {
        await axios
          .post(
            `${this.baseUrl}/media/${data.id}`,
            {
              alt_text: altText || "",
              caption: caption || "",
              title: imageTitle || altText || "",
              description: description || altText || "",
            },
            { headers: this.headers, timeout: 10000 }
          )
          .catch((e) => console.warn("[WP] Media meta update failed:", e.message));
        console.log(`[WP] ✅ File uploaded (ID=${data.id}) alt="${(altText || "").slice(0, 60)}"`);
      }

      return { id: data?.id, source_url: data?.source_url };
    } catch (err) {
      console.warn(`[WP] File upload failed (${err.message})`);
      return null;
    }
  }

  /**
   * Upload image to WP media library from a remote URL.
   * Sets alt_text, caption, title, and description on the media item.
   */
  async uploadImage(imageUrl, altText = "", caption = "", imageTitle = "", description = "") {
    if (!imageUrl) return null;
    try {
      const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
      const contentType = imgResponse.headers["content-type"] || "image/jpeg";
      const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
      const filename = `article-${Date.now()}.${ext}`;

      const { data } = await axios.post(
        `${this.baseUrl}/media`,
        imgResponse.data,
        {
          headers: {
            Authorization: this.authHeader,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": contentType,
          },
          timeout: 40000,
        }
      );

      if (data?.id) {
        await axios
          .post(
            `${this.baseUrl}/media/${data.id}`,
            {
              alt_text: altText || "",
              caption: caption || "",
              title: imageTitle || altText || "",
              description: description || altText || "",
            },
            { headers: this.headers, timeout: 10000 }
          )
          .catch((e) => console.warn("[WP] Media meta update failed:", e.message));
        console.log(`[WP] ✅ Image uploaded (ID=${data.id}) alt="${(altText || "").slice(0, 60)}"`);
      }

      return {
        id: data?.id,
        source_url: data?.source_url
      };
    } catch (err) {
      console.warn(`[WP] Image upload skipped (${err.message})`);
      return null;
    }
  }

  async resolveCategory(categoryName) {
    if (!categoryName) return null;
    try {
      const { data } = await axios.get(
        `${this.baseUrl}/categories?search=${encodeURIComponent(categoryName)}&per_page=5`,
        { headers: this.headers, timeout: 10000 }
      );
      if (data?.length > 0) return data[0].id;
      const { data: created } = await axios.post(
        `${this.baseUrl}/categories`,
        { name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") },
        { headers: this.headers, timeout: 10000 }
      );
      return created?.id || null;
    } catch {
      return null;
    }
  }

  /** Resolve a comma-separated string or array of category names → array of WP IDs. */
  async resolveCategories(categoriesInput) {
    if (!categoriesInput) return [];
    const names = Array.isArray(categoriesInput)
      ? categoriesInput
      : String(categoriesInput).split(",").map((s) => s.trim()).filter(Boolean);
    const ids = [];
    for (const name of names.slice(0, 5)) {
      const id = await this.resolveCategory(name);
      if (id) ids.push(id);
    }
    return ids;
  }

  async resolveTags(tagsInput) {
    if (!tagsInput) return [];
    const tagNames =
      typeof tagsInput === "string"
        ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
        : Array.isArray(tagsInput) ? tagsInput : [];

    const ids = [];
    for (const name of tagNames.slice(0, 15)) {
      try {
        const { data } = await axios.get(
          `${this.baseUrl}/tags?search=${encodeURIComponent(name)}&per_page=5`,
          { headers: this.headers, timeout: 8000 }
        );
        if (data?.length > 0) {
          ids.push(data[0].id);
        } else {
          const { data: created } = await axios.post(
            `${this.baseUrl}/tags`,
            { name },
            { headers: this.headers, timeout: 8000 }
          );
          if (created?.id) ids.push(created.id);
        }
      } catch {
        // skip individual tag failures
      }
    }
    return ids;
  }

  /**
   * Build WP REST payload.
   * Content comes pre-rendered — no conversion needed.
   */
  buildWpPayload(article, mediaId, categoryIds, tagIds) {
    const seoTitle = (article.seo_title || article.title || "").trim();
    const ogDesc = (article.og_description || article.meta_description || "").trim();
    const yoastMeta = this.buildYoastMeta(article, mediaId || null);

    // Content is already clean HTML from htmlRenderer — use directly
    const content = String(article.content || "").trim();
    const excerpt = String(article.excerpt || article.summary || "").trim();

    // Normalise categoryIds: accept a single id, an array, or null
    const categories = Array.isArray(categoryIds)
      ? categoryIds
      : categoryIds ? [categoryIds] : [];

    // Product rule: posts are ALWAYS saved as WordPress draft (never live publish).
    return {
      title: seoTitle,
      slug: article.slug || "",
      content,
      excerpt,
      status: "draft",
      format: article.format || "standard",
      sticky: Boolean(article.sticky),
      featured_media: mediaId || 0,
      categories,
      tags: tagIds || [],
      meta: {
        ...yoastMeta,
        jetpack_publicize_message: ogDesc || article.summary || "",
      },
    };
  }

  async publish(articleRaw) {
    // ── PRE-PUBLISH SEO PIPELINE (pure JS fixes, no AI calls) ────────────
    let article = articleRaw;
    try {
      article = await runPrePublishPipeline(articleRaw);
      console.log(
        `[WP] ✅ Pipeline done — SEO: ${article._seo_score ?? "N/A"}/100 (${article._seo_grade ?? ""})` +
        ` | Words: ${article._word_count ?? "?"}`
      );
      if (article._seo_issues?.length > 0) {
        console.log(`[WP] ⚠️  Remaining issues: ${article._seo_issues.join(" | ")}`);
      }
    } catch (pipelineErr) {
      console.warn(`[WP] Pipeline failed: ${pipelineErr.message} — publishing with original data`);
      article = articleRaw;
    }

    const portalSlug = this.portal.slug;
    const existingPostId = article[`wp_${portalSlug}_post_id`];
    const isMarathi = isMarathiText(article.title || article.content || "");
    const focusKw = resolveFocusKeyword(article);

    // ── Extract up to 4 images ───────────────────────────────────────────
    let imagesArr = [];
    if (article.images) {
      if (typeof article.images === "string") {
        try { imagesArr = JSON.parse(article.images); } catch (e) { }
      } else if (Array.isArray(article.images)) {
        imagesArr = article.images;
      }
    }

    // Fallback if images array is empty but we have a featured_image_url
    if (imagesArr.length === 0 && (article.featured_image_url || article.image_url)) {
      imagesArr.push({
        url: article.featured_image_url || article.image_url,
        altText: article.featured_image_alt || article.image_alt || article.title || "",
        caption: article.featured_image_caption || ""
      });
    }

    imagesArr = imagesArr.slice(0, 4);

    // ── Upload images to WordPress ───────────────────────────────────────
    const uploadedImages = [];
    let primaryMediaId = null;
    const hasFeaturedFlag = imagesArr.some((img) => img.isFeatured);

    for (let i = 0; i < imagesArr.length; i++) {
      const imgInfo = imagesArr[i];
      const isFirst = i === 0;
      const fallbackSeo = generateImageSeo(article.title || "", article.focus_keyword || "", isMarathi);

      const rawAlt = imgInfo.altText || imgInfo.alt_text || (isFirst ? (article.featured_image_alt || fallbackSeo.altText) : fallbackSeo.altText);
      const alt = ensureAltText(rawAlt, focusKw, fallbackSeo.altText);
      const cap = imgInfo.caption || (isFirst ? (article.featured_image_caption || fallbackSeo.caption) : fallbackSeo.caption);
      const desc = isFirst ? (article._image_description || alt) : alt;

      // Already on WP (e.g. uploaded via /publish/upload-images) — skip re-upload
      if (imgInfo.mediaId && imgInfo.url) {
        uploadedImages.push({
          url: imgInfo.url,
          mediaId: imgInfo.mediaId,
          altText: alt,
          caption: cap,
        });
        if (imgInfo.isFeatured || (!hasFeaturedFlag && isFirst)) {
          primaryMediaId = imgInfo.mediaId;
        }
        continue;
      }

      const media = await this.uploadImage(imgInfo.url, alt, cap, article.seo_title || article.title || "", desc);

      if (media?.id && media?.source_url) {
        uploadedImages.push({
          url: media.source_url,
          mediaId: media.id,
          altText: alt,
          caption: cap,
        });

        if (imgInfo.isFeatured || (!hasFeaturedFlag && isFirst)) {
          primaryMediaId = media.id;
        }
      }
    }

    if (!primaryMediaId && uploadedImages[0]?.mediaId) {
      primaryMediaId = uploadedImages[0].mediaId;
    }

    const featuredWpUrl =
      uploadedImages.find((_, idx) => imagesArr[idx]?.isFeatured)?.url ||
      uploadedImages[0]?.url ||
      "";
    if (featuredWpUrl) {
      article.featured_image_url = featuredWpUrl;
      article.og_image = featuredWpUrl;
      article.image_url = featuredWpUrl;
    }

    // ── Inject uploaded images into content ─────────────────────
    if (uploadedImages.length > 0 && article._article_json) {
      console.log(`[WP] 🖼 Re-rendering Gutenberg HTML with ${uploadedImages.length} uploaded image(s)`);
      article.content = renderArticleHtml(article._article_json, uploadedImages, {
        siteUrl:   isMarathi ? "navimumbaiheadlines.com" : "nashikheadlines.com",
        sourceUrl: article.source_url || (isMarathi ? "https://maharashtra.gov.in" : "https://pib.gov.in"),
        isMarathi,
      });
    } else if (uploadedImages.length > 0) {
      console.log(`[WP] 🖼 Injecting ${uploadedImages.length} image(s) into article HTML`);
      article.content = injectImagesIntoHtml(article.content, uploadedImages);
    }

    const categoryIds = await this.resolveCategories(article.category_name || article.category || null);
    const tagIds = await this.resolveTags(article.tags);
    const payload = this.buildWpPayload(article, primaryMediaId, categoryIds, tagIds);

    // ── Create or update the post ────────────────────────────────────────
    let response;
    if (existingPostId) {
      response = await axios.put(`${this.baseUrl}/posts/${existingPostId}`, payload, { headers: this.headers, timeout: 30000 });
    } else {
      response = await axios.post(`${this.baseUrl}/posts`, payload, { headers: this.headers, timeout: 30000 });
    }

    const postId = response.data.id;
    console.log(`[WP] Post ${existingPostId ? 'updated' : 'created'}: ID=${postId}`);

    // ── Set Yoast SEO via mu-plugin (required for full Yoast panel sync) ──
    const yoastMeta = this.buildYoastMeta(article, primaryMediaId);
    try {
      const metaResponse = await axios.post(
        `${this.siteApiBase}/nmh/v1/set-seo-meta`,
        { post_id: postId, meta: yoastMeta },
        { headers: this.headers, timeout: 15000 }
      );

      const result = metaResponse.data;
      if (result?.success) {
        console.log(`[WP] ✅ Yoast meta saved: ${result.count} fields via nmh/v1`);
        if (result.skipped?.length) {
          console.warn(`[WP] Skipped keys: ${result.skipped.join(", ")}`);
        }
      } else {
        console.warn("[WP] nmh/v1/set-seo-meta returned:", result);
      }
    } catch (metaErr) {
      const status = metaErr?.response?.status;
      if (status === 404) {
        console.warn(
          "[WP] ⚠️  Yoast bridge missing (404). Install mu-plugin:\n" +
          "       backend/wordpress-plugin/yoast-rest-api-bridge.php → /wp-content/mu-plugins/\n" +
          "       Verify: GET " + this.siteApiBase + "/nmh/v1/ping"
        );
        console.warn("[WP] Partial Yoast meta was sent via post meta in REST payload.");
      } else {
        console.warn(`[WP] Yoast meta step failed: ${metaErr.message}`);
      }
    }

    return {
      post_id: postId,
      url: response.data.link,
      status: "draft",
      media_id: primaryMediaId,
    };
  }
}

module.exports = WordPressPublisher;
