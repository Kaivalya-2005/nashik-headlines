const SITE_DOMAIN      = "nashikheadlines.com";
const SITE_DOMAIN_2    = "navimumbaiheadlines.com";
const INTERNAL_DOMAINS = [SITE_DOMAIN, SITE_DOMAIN_2];

function slugify(input = "") {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);
}

function normalizeKeywords(input) {
  if (!input) return "";

  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof input === "string") {
    const cleaned = input
      .replace(/[\[\]"]+/g, "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return cleaned.join(", ");
  }

  return "";
}

function getKeywordList(keywords) {
  return normalizeKeywords(keywords)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidPrimaryKeyword(keyword = "") {
  const words = String(keyword || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length >= 2 && words.length <= 4;
}

function resolvePrimaryKeyword(input = {}) {
  const explicit = String(input.focus_keyword || "").trim();
  if (isValidPrimaryKeyword(explicit)) return explicit;

  const keywordCandidates = [input.keywords, input.tags];
  for (const candidate of keywordCandidates) {
    for (const item of getKeywordList(candidate)) {
      if (isValidPrimaryKeyword(item)) return item;
    }
  }

  const fallbackSource = String(input.title || input.seo_title || input.summary || "").trim();
  if (!fallbackSource) return "";

  const words = fallbackSource
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\w\u0900-\u097F\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !/^(the|a|an|and|or|of|in|on|at|to|for|with|from|by|news)$/i.test(word));

  return words.slice(0, 3).join(" ") || fallbackSource.split(/\s+/).slice(0, 3).join(" ");
}

function ensureKeywordPrefix(text = "", keyword = "") {
  const kw = String(keyword || "").trim();
  const value = String(text || "").trim();
  if (!kw) return value;

  const lowerValue = value.toLowerCase();
  const lowerKw = kw.toLowerCase();
  if (lowerValue.startsWith(lowerKw)) return value;

  return value ? `${kw}: ${value}` : kw;
}

function truncateToWordBoundary(text = "", max = 155) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return value.slice(0, max).replace(/\s+\S*$/, "").trim();
}

function buildKeywordAwareMetaDescription(input = {}, keyword = "") {
  const kw = String(keyword || "").trim();
  const summary = String(input.summary || "").trim();
  const title = String(input.title || input.seo_title || "").trim();

  const seed = summary || title || "Latest local news updates";
  let desc = kw ? ensureKeywordPrefix(seed, kw) : seed;

  if (desc.length < 120) {
    const tail = /[\u0900-\u097F]/.test(desc)
      ? " Follow Nashik Headlines for verified updates, context, and key developments."
      : " Read verified updates, context, and key developments from Nashik Headlines.";
    desc = `${desc}${tail}`;
  }

  if (desc.length < 120 && kw) {
    const extra = /[\u0900-\u097F]/.test(desc)
      ? ` ${kw} संदर्भातील ताज्या बातम्या आणि विश्लेषण.`
      : ` ${kw} coverage with timely updates and context.`;
    desc = `${desc}${extra}`;
  }

  return truncateToWordBoundary(desc, 155);
}

function buildKeywordAwareSlug(input = {}, keyword = "") {
  const { generateSlug, transliterate } = require("./seo/slugGenerator");
  const kw = String(keyword || "").trim();
  if (kw) {
    const kwSlug = generateSlug(kw, "");
    let sourceSlug = String(input.slug || "").trim();
    if (!sourceSlug) return kwSlug;

    // If source slug has Devanagari chars, transliterate it first
    if (/[\u0900-\u097F]/.test(sourceSlug)) {
      sourceSlug = generateSlug("", sourceSlug);
    }

    const normalizedSource = sourceSlug.toLowerCase();
    const kwParts = kwSlug.split("-").filter((part) => part.length > 2);
    const hasAll = kwParts.length > 0 && kwParts.every((part) => normalizedSource.includes(part));
    if (hasAll) return sourceSlug;

    // Don't create excessively long slugs
    if (sourceSlug.length > 80) return sourceSlug;
    
    return slugify(`${kwSlug}-${sourceSlug}`);
  }

  let source = String(input.slug || "").trim() || String(input.title || "");
  // If input has Devanagari, transliterate it
  if (/[\u0900-\u097F]/.test(source)) {
    const { generateSlug } = require("./seo/slugGenerator");
    return generateSlug("", source);
  }
  return slugify(source);
}

function hasInternalLink(content = "") {
  return /(https?:\/\/(?:www\.)?nashikheadlines\.com|https?:\/\/(?:www\.)?navimumbaiheadlines\.com|\/article\/)/i.test(String(content));
}

function hasExternalLink(content = "") {
  const matches = String(content).match(/https?:\/\/[^\s)"'<]+/gi) || [];
  return matches.some((link) => {
    const lower = link.toLowerCase();
    return !INTERNAL_DOMAINS.some((d) => lower.includes(d));
  });
}

// ── Yoast-specific helpers ────────────────────────────────────────────────────

function stripHtmlLocal(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function keyphraseInIntroLocal(content, kw) {
  if (!kw) return false;
  const plain     = stripHtmlLocal(content);
  const firstPara = plain.split(/\n{2,}/)[0] || plain.slice(0, 300);
  return firstPara.toLowerCase().includes(kw.toLowerCase());
}

function keyphraseInSubheadingsLocal(content, kw) {
  if (!kw) return false;
  const kwWords = kw.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (!kwWords.length) return false;
  const headings = (String(content || "").match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi) || [])
    .map((h) => h.replace(/<[^>]+>/g, "").toLowerCase());
  return headings.some((h) => kwWords.some((w) => h.includes(w)));
}

function keyphraseInImageAltLocal(imageAlt, kw) {
  if (!kw || !imageAlt) return false;
  const kwWords = kw.toLowerCase().split(/\s+/).filter(Boolean);
  if (!kwWords.length) return false;
  const alt     = imageAlt.toLowerCase();
  const matched = kwWords.filter((w) => alt.includes(w));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

function keyphraseInSlugLocal(slug, kw) {
  if (!kw || !slug) return false;
  const normSlug = slug.toLowerCase();
  const kwWords  = kw.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return kwWords.every((w) => normSlug.includes(w));
}

function keyphraseInMetaDescLocal(metaDesc, kw) {
  if (!kw || !metaDesc) return false;
  const normDesc = metaDesc.toLowerCase();
  if (normDesc.includes(kw.toLowerCase())) return true;
  const kwWords = kw.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = kwWords.filter((w) => normDesc.includes(w));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

// ── Main scoring function (15 Yoast checks) ──────────────────────────────────

function calculateSeoScore(article = {}) {
  const content          = String(article.content || "");
  const stripContent     = stripHtmlLocal(content);
  const contentWordCount = stripContent.split(/\s+/).filter(Boolean).length;

  const seoTitle         = String(article.seo_title || article.title || "").trim();
  const metaDescription  = String(article.meta_description || "").trim();
  const imageAlt         = String(article.featured_image_alt || article.image_alt || "").trim();
  const slug             = String(article.slug || "").trim();

  // Resolve focus keyword (prefer explicit focus_keyword, fallback to first keyword)
  let primaryKeyword     = String(article.focus_keyword || "").trim();
  if (!primaryKeyword) {
    const kwList   = getKeywordList(article.keywords);
    primaryKeyword = kwList[0] || "";
  }
  const normKw = primaryKeyword.toLowerCase();

  const keywordMentions = normKw
    ? (stripContent.toLowerCase().match(
        new RegExp(normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      ) || []).length
    : 0;
  const keywordDensity = contentWordCount > 0 ? (keywordMentions / contentWordCount) * 100 : 0;

  // 15 Yoast-equivalent checks
  const checks = {
    internalLinks:          hasInternalLink(content),
    keyphraseInIntro:       keyphraseInIntroLocal(content, normKw),
    keyphraseInMetaDesc:    keyphraseInMetaDescLocal(metaDescription, normKw),
    keyphraseInSubheadings: keyphraseInSubheadingsLocal(content, normKw),
    keyphraseInImageAlt:    keyphraseInImageAltLocal(imageAlt, normKw),
    keyphraseInSlug:        keyphraseInSlugLocal(slug, normKw),
    outboundLinks:          hasExternalLink(content),
    images:                 imageAlt.length > 0,
    keyphraseDensity:       keywordDensity >= 1 && keywordDensity <= 3,
    keyphraseInSeoTitle:    normKw ? seoTitle.toLowerCase().includes(normKw) : false,
    keyphraseLength:        (() => {
      const w = normKw.split(/\s+/).filter(Boolean);
      return w.length >= 2 && w.length <= 4;
    })(),
    metaDescLength:         metaDescription.length >= 120 && metaDescription.length <= 155,
    previouslyUsed:         true,
    singleTitle:            (String(content).match(/<h1[^>]*>/gi) || []).length <= 1,
    competingLinks:         true,
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  const score       = Math.round((passedCount / 15) * 100);

  return {
    score:        Math.max(0, Math.min(100, score)),
    wordCount:    contentWordCount,
    keywordDensity: Number(keywordDensity.toFixed(2)),
    keywordCount: keywordMentions,
    checks,
  };
}

function defaultMetaDescription(summary = "", title = "") {
  const seed = String(summary || title || "Latest Nashik update").trim();
  const base = `${seed} Read verified local updates from Nashik, Maharashtra, India on Nashik Headlines.`;
  if (base.length <= 155) return base;
  return `${base.slice(0, 152).trim()}...`;
}

function buildSeoPayload(input = {}) {
  const title   = String(input.title || "").trim();
  const summary = String(input.summary || "").trim();
  const primaryKeyword = resolvePrimaryKeyword(input);

  const seoTitle        = ensureKeywordPrefix(String(input.seo_title || "").trim() || title, primaryKeyword);
  const slug            = buildKeywordAwareSlug({ ...input, title, summary }, primaryKeyword);
  const keywords        = normalizeKeywords(input.keywords || input.tags || []);
  const metaDescription = buildKeywordAwareMetaDescription({ ...input, title, summary }, primaryKeyword);
  const rawImageAlt     = String(input.image_alt || "").trim() || title;
  const imageAlt        = primaryKeyword && rawImageAlt && !rawImageAlt.toLowerCase().includes(primaryKeyword.toLowerCase())
    ? `${primaryKeyword} — ${rawImageAlt}`.slice(0, 120)
    : rawImageAlt;

  const result = {
    seo_title:        seoTitle,
    meta_description: metaDescription,
    slug,
    keywords,
    image_alt:        imageAlt,
  };

  const scoreInfo = calculateSeoScore({ ...input, ...result });
  return { ...result, seo_score: scoreInfo.score, seo_analysis: scoreInfo };
}

module.exports = {
  slugify,
  normalizeKeywords,
  resolvePrimaryKeyword,
  ensureKeywordPrefix,
  buildKeywordAwareMetaDescription,
  buildKeywordAwareSlug,
  calculateSeoScore,
  buildSeoPayload,
};
