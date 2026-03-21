const SITE_DOMAIN = "nashikheadlines.com";

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

function firstParagraph(content = "") {
  return String(content).split(/\n{2,}/)[0] || "";
}

function hasHeadingStructure(content = "") {
  const text = String(content);
  const htmlHeading = /<h[1-3][^>]*>/i.test(text);
  const markdownHeading = /^#{1,3}\s+/m.test(text);
  return htmlHeading || markdownHeading;
}

function hasInternalLink(content = "") {
  return /https?:\/\/(?:www\.)?nashikheadlines\.com|\/article\//i.test(String(content));
}

function hasExternalLink(content = "") {
  const matches = String(content).match(/https?:\/\/[^\s)]+/gi) || [];
  return matches.some((link) => !link.toLowerCase().includes(SITE_DOMAIN));
}

function containsLocationSignals(text = "") {
  const value = String(text).toLowerCase();
  return ["nashik", "maharashtra", "india"].some((token) => value.includes(token));
}

function calculateSeoScore(article = {}) {
  const content = String(article.content || "");
  const contentWordCount = content.split(/\s+/).filter(Boolean).length;

  const seoTitle = String(article.seo_title || "").trim();
  const title = String(article.title || "").trim();
  const metaDescription = String(article.meta_description || "").trim();
  const imageAlt = String(article.image_alt || "").trim();
  const slug = String(article.slug || "").trim();
  const keywords = getKeywordList(article.keywords);

  const primaryKeyword = keywords[0] || "";
  const titleForKeyword = `${seoTitle} ${title}`.toLowerCase();
  const keywordInTitle = primaryKeyword
    ? titleForKeyword.includes(primaryKeyword.toLowerCase())
    : false;

  const keywordMentions = primaryKeyword
    ? (content.toLowerCase().match(new RegExp(primaryKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
  const keywordDensity = contentWordCount > 0 ? (keywordMentions / contentWordCount) * 100 : 0;
  const keywordDensityOk = keywordDensity >= 1 && keywordDensity <= 2;

  const checks = {
    seoTitlePresent: seoTitle.length > 0,
    metaDescriptionPresent: metaDescription.length >= 150 && metaDescription.length <= 160,
    keywordInTitle,
    contentLength: contentWordCount >= 600,
    headings: hasHeadingStructure(content),
    imageAlt: imageAlt.length > 0,
    internalLinks: hasInternalLink(content),
    externalLinks: hasExternalLink(content),
    slug: slug.length > 0,
    locationSignals:
      containsLocationSignals(`${title} ${seoTitle} ${metaDescription} ${content.slice(0, 600)}`),
    keywordDensity: keywordDensityOk,
  };

  let score = 0;
  score += checks.seoTitlePresent ? 10 : 0;
  score += checks.metaDescriptionPresent ? 10 : 0;
  score += checks.keywordInTitle ? 10 : 0;
  score += checks.contentLength ? 10 : 0;
  score += checks.headings ? 10 : 0;
  score += checks.imageAlt ? 10 : 0;
  score += checks.internalLinks ? 10 : 0;
  score += checks.externalLinks ? 10 : 0;
  score += checks.slug ? 10 : 0;
  score += checks.locationSignals ? 10 : 0;

  return {
    score: Math.max(0, Math.min(100, score)),
    wordCount: contentWordCount,
    keywordDensity: Number(keywordDensity.toFixed(2)),
    checks,
  };
}

function defaultMetaDescription(summary = "", title = "") {
  const seed = String(summary || title || "Latest Nashik update").trim();
  const base = `${seed} Read verified local updates from Nashik, Maharashtra, India on Nashik Headlines.`;
  if (base.length <= 160) return base;
  return `${base.slice(0, 157).trim()}...`;
}

function buildSeoPayload(input = {}) {
  const title = String(input.title || "").trim();
  const summary = String(input.summary || "").trim();

  const seoTitle = String(input.seo_title || "").trim() || title;
  const slug = String(input.slug || "").trim() || slugify(title);
  const keywords = normalizeKeywords(input.keywords || input.tags || []);
  const metaDescription =
    String(input.meta_description || "").trim() || defaultMetaDescription(summary, title);
  const imageAlt = String(input.image_alt || "").trim() || title;

  const result = {
    seo_title: seoTitle,
    meta_description: metaDescription,
    slug,
    keywords,
    image_alt: imageAlt,
  };

  const scoreInfo = calculateSeoScore({ ...input, ...result });
  return { ...result, seo_score: scoreInfo.score, seo_analysis: scoreInfo };
}

module.exports = {
  slugify,
  normalizeKeywords,
  calculateSeoScore,
  buildSeoPayload,
};
