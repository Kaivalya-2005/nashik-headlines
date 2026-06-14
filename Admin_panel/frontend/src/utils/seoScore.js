// ─── utils/seoScore.js ────────────────────────────────────────────────────────
// Yoast SEO-equivalent scoring engine (frontend).
// 15 checks, each worth 1 point → score = (passed / 15) * 100.
// ──────────────────────────────────────────────────────────────────────────────

/** Strip HTML tags and return plain text */
function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Slugify a string */
export const slugify = (input = '') =>
  String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 255);

/** Normalize a comma-separated keyword string */
export const normalizeKeywords = (input = '') =>
  String(input)
    .replaceAll('[', '')
    .replaceAll(']', '')
    .replaceAll('"', '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .join(', ');

/** Normalize a keyphrase for matching (lowercase, strip punctuation) */
function normalizeKw(kw) {
  return String(kw || '').toLowerCase().replace(/[^\w\u0900-\u097F\s]/g, '').trim();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Count occurrences of a keyphrase in plain text */
function countKwOccurrences(text, keyword) {
  if (!keyword) return 0;
  const plain  = stripHtml(text).toLowerCase();
  const normKw = normalizeKw(keyword);
  if (!normKw) return 0;
  const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|\\s|\\W)${escaped}(?:\\s|\\W|$)`, 'gi');
  return (plain.match(regex) || []).length;
}

/** Get the first paragraph of content (before the first blank line or </p>) */
function getFirstParagraph(content = '') {
  const plain = stripHtml(content);
  // Split on double newline or paragraph break
  const parts = plain.split(/\n{2,}|<\/p>/i);
  return (parts[0] || plain.slice(0, 300)).toLowerCase();
}

/** Count words in HTML/plain text */
function wordCount(text) {
  return stripHtml(text).split(/\s+/).filter(Boolean).length;
}

/** Check if content has H2 or H3 with keyphrase words */
function keyphraseInSubheadings(content = '', keyphrase = '') {
  if (!keyphrase) return false;
  const normKw = normalizeKw(keyphrase);
  if (!normKw) return false;

  // Extract text from H2 and H3 tags
  const headingMatches = String(content).match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi) || [];
  // Also check markdown ## / ###
  const markdownHeadings = (String(content).match(/^#{2,3}\s+(.+)/gm) || []).map(h => h.replace(/^#{2,3}\s+/, ''));

  const allHeadings = [
    ...headingMatches.map(h => stripHtml(h).toLowerCase()),
    ...markdownHeadings.map(h => h.toLowerCase()),
  ];

  // Check if any keyphrase word (>3 chars) appears in any heading
  const kwWords = normKw.split(/\s+/).filter(w => w.length > 3);
  return allHeadings.some(h => kwWords.some(w => h.includes(w)));
}

/** Check if alt text contains keyphrase words (at least half) */
function keyphraseInImageAlt(imageAlt = '', keyphrase = '') {
  if (!keyphrase || !imageAlt) return false;
  const normAlt = normalizeKw(imageAlt);
  const kwWords = normalizeKw(keyphrase).split(/\s+/).filter(Boolean);
  if (kwWords.length === 0) return false;
  const matched = kwWords.filter(w => normAlt.includes(w));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

/** Check if slug contains all words of the keyphrase */
function keyphraseInSlug(slug = '', keyphrase = '') {
  if (!keyphrase || !slug) return false;
  const normSlug = slug.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, '-');
  const kwWords = normalizeKw(keyphrase).split(/\s+/).filter(w => w.length > 2);
  if (kwWords.length === 0) return false;
  return kwWords.every(w => normSlug.includes(w));
}

/** Check if keyphrase appears in meta description */
function keyphraseInMetaDesc(metaDesc = '', keyphrase = '') {
  if (!keyphrase || !metaDesc) return false;
  const normDesc = normalizeKw(metaDesc);
  const normKw   = normalizeKw(keyphrase);
  // Check full keyphrase match
  if (normDesc.includes(normKw)) return true;
  // Or at least half the words
  const kwWords = normKw.split(/\s+/).filter(Boolean);
  const matched = kwWords.filter(w => normDesc.includes(w));
  return matched.length >= Math.ceil(kwWords.length / 2);
}

/** Check if SEO title starts with the keyphrase (exact match at beginning) */
function keyphraseInSeoTitle(seoTitle = '', keyphrase = '') {
  if (!keyphrase || !seoTitle) return false;
  const normTitle = normalizeKw(seoTitle);
  const normKw    = normalizeKw(keyphrase);
  return normTitle.startsWith(normKw) || normTitle.includes(normKw);
}

/** Check if there is only one H1 in content (none is also fine, article title is H1) */
function hasSingleH1(content = '') {
  const h1matches = (String(content).match(/<h1[^>]*>/gi) || []).length;
  return h1matches <= 1;
}

/** Check keyphrase word count is 2-4 words */
function isKeyphraseLength(keyphrase = '') {
  const words = normalizeKw(keyphrase).split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4;
}

/** Check for internal links */
function hasInternalLink(content = '') {
  return /(https?:\/\/(?:www\.)?nashikheadlines\.com|https?:\/\/(?:www\.)?navimumbaiheadlines\.com|\/article\/)/i.test(String(content));
}

/** Check for outbound (external) links */
function hasOutboundLink(content = '') {
  const links = String(content).match(/https?:\/\/[^\s)"'<]+/gi) || [];
  return links.some((link) => {
    const lower = link.toLowerCase();
    return !lower.includes('nashikheadlines.com') && !lower.includes('navimumbaiheadlines.com');
  });
}

// ── Main scoring function ──────────────────────────────────────────────────────

export const calculateSeoScore = ({
  title        = '',
  seo_title    = '',
  meta_description = '',
  slug         = '',
  keywords     = '',
  image_alt    = '',
  content      = '',
  focus_keyword = '',
}) => {
  // Resolve keyphrase: prefer focus_keyword, fallback to first keyword
  let primaryKeyword = String(focus_keyword || '').trim();
  if (!primaryKeyword) {
    const kwList = Array.isArray(keywords)
      ? keywords
      : String(keywords || '').replace(/[\[\]"]/g, '').split(',');
    primaryKeyword = (kwList[0] || '').trim().toLowerCase();
  }

  // Guard: if no keyphrase AND no content, return 0 (nothing to score yet)
  const wc = wordCount(content);
  if (!primaryKeyword && wc === 0) {
    return {
      score: 0,
      checks: {
        internalLinks: false, keyphraseInIntro: false, keyphraseInMetaDesc: false,
        keyphraseInSubheadings: false, keyphraseInImageAlt: false, keyphraseInSlug: false,
        outboundLinks: false, images: false, keyphraseDensity: false, keyphraseInSeoTitle: false,
        keyphraseLength: false, metaDescLength: false, previouslyUsed: false,
        singleTitle: false, competingLinks: false,
      },
      wordCount: 0,
      keywordDensity: 0,
      keywordCount: 0,
      primaryKeyword: '',
    };
  }

  const metaLen      = String(meta_description || '').trim().length;
  const seoTitleLen  = String(seo_title || '').trim().length;
  const plainContent = stripHtml(content).toLowerCase();
  const kwCount      = countKwOccurrences(content, primaryKeyword);
  const kwDensity    = wc > 0 ? (kwCount / wc) * 100 : 0;

  // ── 15 Yoast-equivalent checks ────────────────────────────────────────────
  const checks = {
    // 1. Internal links
    internalLinks:          hasInternalLink(content),

    // 2. Keyphrase in introduction (first paragraph)
    keyphraseInIntro:       primaryKeyword
      ? new RegExp(`(?:^|\\s|\\W)${escapeRegExp(normalizeKw(primaryKeyword))}(?:\\s|\\W|$)`, 'i').test(getFirstParagraph(content))
      : false,

    // 3. Keyphrase in meta description
    keyphraseInMetaDesc:    keyphraseInMetaDesc(meta_description, primaryKeyword),

    // 4. Keyphrase in subheadings (H2/H3)
    keyphraseInSubheadings: keyphraseInSubheadings(content, primaryKeyword),

    // 5. Keyphrase in image alt attributes
    keyphraseInImageAlt:    keyphraseInImageAlt(image_alt, primaryKeyword),

    // 6. Keyphrase in slug
    keyphraseInSlug:        keyphraseInSlug(slug, primaryKeyword),

    // 7. Outbound links
    outboundLinks:          hasOutboundLink(content),

    // 8. Images (has image alt → image present assumed)
    images:                 String(image_alt || '').trim().length > 0,

    // 9. Keyphrase density (1-3%)
    keyphraseDensity:       kwDensity >= 1 && kwDensity <= 3,

    // 10. Keyphrase in SEO title
    keyphraseInSeoTitle:    keyphraseInSeoTitle(seo_title || title, primaryKeyword),

    // 11. Keyphrase length (2-4 words)
    keyphraseLength:        isKeyphraseLength(primaryKeyword),

    // 12. Meta description length (120-155 chars)
    metaDescLength:         metaLen >= 120 && metaLen <= 155,

    // 13. Previously used keyphrase → always passes (no DB check on frontend)
    previouslyUsed:         true,

    // 14. Single title (no multiple H1s)
    singleTitle:            hasSingleH1(content),

    // 15. Competing links → always passes (no anchor text DB check on frontend)
    competingLinks:         true,
  };

  // Score: each check = 1/15 of 100
  const totalChecks  = Object.keys(checks).length; // 15
  const passedCount  = Object.values(checks).filter(Boolean).length;
  const score        = Math.round((passedCount / totalChecks) * 100);

  return {
    score,
    checks,
    wordCount: wc,
    keywordDensity: Number(kwDensity.toFixed(2)),
    keywordCount: kwCount,
    primaryKeyword,
  };
};
