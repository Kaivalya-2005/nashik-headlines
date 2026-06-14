/**
 * services/aiPipeline/prePubPipeline.js
 *
 * Pre-publish SEO pipeline — runs BEFORE every WordPress publish.
 * All steps are pure JS (no AI calls, no token usage).
 *
 * Pipeline:
 *   Article
 *     ↓  Step 1: Keyword in First Paragraph (guaranteed)
 *     ↓  Step 2: Outbound Link Check
 *     ↓  Step 3: Slug Optimization
 *     ↓  Step 4: SEO Title Fix (keyword must lead)
 *     ↓  Step 5: Meta Description Fix (120-155 chars)
 *     ↓  Step 6: Image Alt Text (fallback if missing)
 *     ↓  Step 7: SEO Score Engine
 *   Enhanced Article → WordPress Publisher
 */

const { injectOutboundLinks }         = require("../seo/outboundLinks");
const { generateSlug, ensureKeywordInSlug } = require("../seo/slugGenerator");
const { scoreArticle }                = require("../seo/seoScoreEngine");
const {
  buildSeoPayload,
  resolvePrimaryKeyword,
  ensureKeywordPrefix,
  buildKeywordAwareMetaDescription,
} = require("../seo");

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMarathiArticle(article) {
  return (
    article.language === "mr" ||
    article.publish_to === "navimumbai" ||
    /[\u0900-\u097F]/.test(String(article.content || "") + String(article.focus_keyword || ""))
  );
}

function charCount(str) {
  return String(str || "").trim().length;
}

function wordCount(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function keywordPassesAltRule(altText = "", focusKeyword = "") {
  const kwWords = normalizeText(focusKeyword)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!kwWords.length) return false;

  const alt = normalizeText(altText).toLowerCase();
  const matched = kwWords.filter((word) => alt.includes(word));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

/**
 * Fix SEO title: ensure it starts with the focus keyword.
 */
function fixSeoTitle(seoTitle, focusKeyword) {
  const kw    = String(focusKeyword || "").trim();
  const title = String(seoTitle    || "").trim();
  if (!kw) return title;

  const combined = ensureKeywordPrefix(title || kw, kw);
  if (combined.length <= 60) return combined;
  return combined.slice(0, 60).replace(/\s+\S*$/, "").trim();
}

/**
 * Fix meta description: enforce 120-155 chars, include keyword.
 */
function fixMetaDescription(metaDesc, focusKeyword, title = "", isMarathi = false) {
  let desc = String(metaDesc || "").trim();
  const kw = String(focusKeyword || "").trim();

  if (!kw) {
    return buildKeywordAwareMetaDescription({ title, summary: desc }, title || "");
  }

  if (!desc && title) {
    desc = isMarathi
      ? `${kw} संदर्भातील ताजी बातमी. ${title} — नाशिक हेडलाईन्स वर संपूर्ण माहिती वाचा.`
      : `${kw} — ${title}. Read verified updates and full context from Nashik Headlines.`;
  }

  if (!desc.toLowerCase().includes(kw.toLowerCase())) {
    desc = `${kw} — ${desc || title || "Latest local news update from Nashik Headlines."}`;
  }

  if (desc.length < 120) {
    const pad = isMarathi
      ? " नाशिक हेडलाईन्सवर संपूर्ण बातमी, संदर्भ आणि ताजे अपडेट्स वाचा."
      : " Read verified updates, context, and full coverage from Nashik Headlines.";
    desc = `${desc}${pad}`;
  }

  if (desc.length > 155) {
    desc = desc.slice(0, 155).replace(/\s+\S*$/, "").trim();
  }

  return desc;
}

function fixIntroContent(content, focusKeyword) {
  const kw = String(focusKeyword || "").trim();
  let html = String(content || "").trim();
  if (!kw || !html) return html;

  const firstParagraphRegex = /<p>([\s\S]*?)<\/p>/i;
  const match = html.match(firstParagraphRegex);

  if (match) {
    const firstPara = match[1].trim();
    if (!firstPara.toLowerCase().includes(kw.toLowerCase())) {
      const replacement = `<p><strong>${kw}</strong> — ${firstPara}</p>`;
      html = html.replace(firstParagraphRegex, replacement);
    }
    return html;
  }

  return `<p><strong>${kw}</strong> — ${html}</p>`;
}

function fixSubheadingContent(content, focusKeyword) {
  const kw = String(focusKeyword || "").trim();
  let html = String(content || "").trim();
  if (!kw || !html) return html;

  const headingRegex = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/i;
  if (headingRegex.test(html)) {
    const headings = (html.match(/<h[23][^>]*>[\s\S]*?<\/h[23]>/gi) || []).map((h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase());
    const hasKeyword = headings.some((h) => h.includes(kw.toLowerCase()));
    if (!hasKeyword) {
      html = html.replace(headingRegex, (full, level, attrs, inner) => {
        const cleanInner = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (!cleanInner) return full;
        return `<h${level}${attrs}>${kw} — ${cleanInner}</h${level}>`;
      });
    }
    return html;
  }

  const firstParagraphRegex = /<p>[\s\S]*?<\/p>/i;
  if (firstParagraphRegex.test(html)) {
    return html.replace(firstParagraphRegex, (para) => `${para}\n<h2>${kw}</h2>`);
  }

  return `<h2>${kw}</h2>\n${html}`;
}

/**
 * Generate fallback image alt text if missing.
 */
function ensureImageAlt(article, isMarathi) {
  const kw = String(article.focus_keyword || "").trim();
  const title = String(article.title || "").trim();

  if (article.featured_image_alt && article.featured_image_alt !== title) {
    return article.featured_image_alt;
  }

  if (isMarathi) {
    return `${kw || title} - महाराष्ट्रातील ताज्या बातम्या`.slice(0, 120);
  }
  return `${kw || title} - Latest News from Nashik, Maharashtra`.slice(0, 120);
}

function normalizeImageAlt(altText, focusKeyword, fallbackAlt = "") {
  const kw = String(focusKeyword || "").trim();
  const alt = normalizeText(altText || fallbackAlt);
  if (!kw) return alt;
  if (keywordPassesAltRule(alt, kw)) return alt;

  const base = alt || fallbackAlt || "Latest news update";
  return `${kw} — ${base}`.slice(0, 120);
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Run the pre-publish SEO pipeline (pure JS, no AI calls).
 *
 * @param {object} article - Article object ready for WordPress
 * @returns {object}       - Enhanced article with SEO fixes applied
 */
async function runPrePublishPipeline(article) {
  const startTime   = Date.now();
  const isMarathi   = isMarathiArticle(article);
  const focusKw     = resolvePrimaryKeyword(article);
  const pipelineLog = [];

  const log = (step, msg) => {
    const line = `[PrePubPipeline] [${step}] ${msg}`;
    console.log(line);
    pipelineLog.push({ step, msg, ts: Date.now() });
  };

  log("start", `Article: "${(article.title || "").slice(0, 60)}" | kw: "${focusKw}" | lang: ${isMarathi ? "mr" : "en"}`);

  let content = String(article.content || "").trim();

  // ── STEP 1: Ensure keyword in first paragraph ────────────────────────────
  if (focusKw) {
    const updated = fixIntroContent(content, focusKw);
    if (updated !== content) {
      content = updated;
      log("kw_intro", "Keyword injected into first paragraph ✅");
    } else {
      log("kw_intro", "Keyword already in intro ✅");
    }
  }

  // ── STEP 1b: Ensure keyword appears in a subheading ─────────────────────
  if (focusKw) {
    const updated = fixSubheadingContent(content, focusKw);
    if (updated !== content) {
      content = updated;
      log("kw_heading", "Keyword injected into subheading ✅");
    } else {
      log("kw_heading", "Keyword already in subheading ✅");
    }
  }

  // ── STEP 2: Outbound Links ────────────────────────────────────────────────
  try {
    const before = content.length;
    content = injectOutboundLinks(content, focusKw, { isMarathi });
    log("outbound", content.length > before ? "Outbound links injected ✅" : "Outbound links already present");
  } catch (err) {
    log("outbound_fail", `Outbound link injection failed: ${err.message}`);
  }

  // ── STEP 3: Slug Optimization ─────────────────────────────────────────────
  // NOTE: slug will be regenerated by buildSeoPayload, so we just validate here
  let slug = String(article.slug || "").trim();
  try {
    if (!slug) {
      slug = generateSlug(focusKw, article.title || "");
      log("slug", `Generated: "${slug}"`);
    } else {
      // If slug contains Devanagari, regenerate it as clean Latin
      if (/[\u0900-\u097F]/.test(slug)) {
        const cleaned = generateSlug("", slug);
        log("slug", `Transliterated: "${slug.slice(0, 40)}..." → "${cleaned}"`);
        slug = cleaned;
      } else {
        log("slug", `OK: "${slug}"`);
      }
    }
  } catch (err) {
    log("slug_fail", `Slug failed: ${err.message}`);
  }

  // ── STEP 4: SEO Title Fix ─────────────────────────────────────────────────
  let seoTitle = String(article.seo_title || article.title || "").trim();
  try {
    const fixed = fixSeoTitle(seoTitle, focusKw);
    if (fixed !== seoTitle) {
      log("seo_title", `Fixed: "${seoTitle}" → "${fixed}"`);
      seoTitle = fixed;
    } else {
      log("seo_title", `OK: "${seoTitle}"`);
    }
  } catch (err) {
    log("seo_title_fail", `SEO title fix failed: ${err.message}`);
  }

  // ── STEP 5: Meta Description Fix ──────────────────────────────────────────
  let metaDesc = String(article.meta_description || "").trim();
  try {
    const fixed   = fixMetaDescription(metaDesc, focusKw, article.title, isMarathi);
    const wasFixed = fixed !== metaDesc;
    metaDesc = fixed;
    log("meta_desc", `${wasFixed ? "Fixed" : "OK"}: ${charCount(metaDesc)} chars`);
  } catch (err) {
    log("meta_desc_fail", `Meta desc fix failed: ${err.message}`);
  }

  // ── STEP 6: Image Alt Text ────────────────────────────────────────────────
  const imageAlt = normalizeImageAlt(ensureImageAlt(article, isMarathi), focusKw, article.title || article.summary || "");
  log("image_alt", `Alt text: "${imageAlt.slice(0, 60)}"`);

  // ── Assemble enhanced article ─────────────────────────────────────────────
  const enhanced = {
    ...article,
    content,
    slug,
    seo_title:              seoTitle,
    meta_description:       metaDesc,
    featured_image_alt:     imageAlt,
    image_alt:              imageAlt,
    focus_keyword:          focusKw,
    og_title:               article.og_title          || seoTitle,
    og_description:         article.og_description    || metaDesc,
    twitter_title:          article.twitter_title     || seoTitle,
    twitter_description:    article.twitter_description || metaDesc,
    _pipeline_ran:          true,
    _pipeline_log:          pipelineLog,
    _word_count:            wordCount(content),
  };

  // ── STEP 7: SEO Score ────────────────────────────────────────────────────
  try {
    const normalizedSeo = buildSeoPayload(enhanced);
    enhanced.seo_title = normalizedSeo.seo_title || enhanced.seo_title;
    enhanced.meta_description = normalizedSeo.meta_description || enhanced.meta_description;
    enhanced.slug = normalizedSeo.slug || enhanced.slug;
    enhanced.image_alt = normalizedSeo.image_alt || enhanced.image_alt;
    enhanced.featured_image_alt = normalizedSeo.image_alt || enhanced.featured_image_alt;

    const score = scoreArticle(enhanced);
    enhanced._seo_score         = score.seo_score;
    enhanced._readability_score = score.readability_score;
    enhanced._seo_grade         = score.grade;
    enhanced._seo_issues        = score.issues;
    enhanced._seo_suggestions   = score.suggestions;
    enhanced._seo_passed_checks = score.passed_checks;

    log("score", `SEO: ${score.seo_score}/100 (${score.grade}) | Readability: ${score.readability_score}/100 | Words: ${wordCount(content)}`);
    if (score.issues.length > 0) {
      log("score_issues", `⚠️  Issues (${score.issues.length}): ${score.issues.slice(0, 3).join(" | ")}`);
    }
  } catch (err) {
    log("score_fail", `Scoring failed: ${err.message}`);
  }

  const elapsed = Date.now() - startTime;
  log("done", `Pipeline complete in ${elapsed}ms | Final word count: ${wordCount(content)}`);

  return enhanced;
}

module.exports = { runPrePublishPipeline };
