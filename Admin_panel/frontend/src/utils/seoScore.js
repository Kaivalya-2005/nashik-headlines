export const slugify = (input = "") =>
  String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);

export const normalizeKeywords = (input = "") =>
  String(input)
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replaceAll('"', "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .join(", ");

const hasHeadingStructure = (content = "") => {
  const text = String(content);
  return /<h[1-3][^>]*>/i.test(text) || /^#{1,3}\s+/m.test(text);
};

const hasInternalLink = (content = "") =>
  /https?:\/\/(?:www\.)?nashikheadlines\.com|\/article\//i.test(String(content));

const hasExternalLink = (content = "") => {
  const links = String(content).match(/https?:\/\/[^\s)]+/gi) || [];
  return links.some((link) => !link.toLowerCase().includes("nashikheadlines.com"));
};

const hasLocationSignals = (text = "") => {
  const value = String(text).toLowerCase();
  return ["nashik", "maharashtra", "india"].some((token) => value.includes(token));
};

export const calculateSeoScore = ({
  title = "",
  seo_title = "",
  meta_description = "",
  slug = "",
  keywords = "",
  image_alt = "",
  content = "",
}) => {
  const normalizedKeywords = normalizeKeywords(keywords)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const primaryKeyword = normalizedKeywords[0] || "";
  const words = String(content).split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const cleanPrimaryKeyword = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase();
  const keywordMentions = cleanPrimaryKeyword
    ? (String(content).toLowerCase().match(new RegExp(cleanPrimaryKeyword, "g")) || []).length
    : 0;
  const keywordDensity = wordCount ? Number(((keywordMentions / wordCount) * 100).toFixed(2)) : 0;

  const checks = {
    seoTitlePresent: String(seo_title).trim().length > 0,
    metaDescription: String(meta_description).trim().length >= 100 && String(meta_description).trim().length <= 160,
    keywordInTitle: primaryKeyword
      ? `${seo_title} ${title}`.toLowerCase().includes(primaryKeyword.toLowerCase())
      : false,
    contentLength: wordCount >= 300,
    headings: hasHeadingStructure(content),
    imageAlt: String(image_alt).trim().length > 0,
    internalLinks: hasInternalLink(content),
    externalLinks: hasExternalLink(content),
    slugPresent: String(slug).trim().length > 0,
    locationSignals: hasLocationSignals(`${title} ${seo_title} ${meta_description} ${String(content).slice(0, 600)}`),
  };

  let score = 0;
  score += checks.seoTitlePresent ? 10 : 0;
  score += checks.metaDescription ? 10 : 0;
  score += checks.keywordInTitle ? 10 : 0;
  score += checks.contentLength ? 10 : 0;
  score += checks.headings ? 10 : 0;
  score += checks.imageAlt ? 10 : 0;
  score += checks.internalLinks ? 10 : 0;
  score += checks.externalLinks ? 10 : 0;
  score += checks.slugPresent ? 10 : 0;
  score += checks.locationSignals ? 10 : 0;

  return {
    score,
    checks,
    wordCount,
    keywordDensity,
  };
};
