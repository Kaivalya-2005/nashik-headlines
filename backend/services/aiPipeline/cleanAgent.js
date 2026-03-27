/**
 * cleanAgent.js
 * -------------
 * Responsible for sanitizing raw scraped article content.
 *
 * Tasks:
 *  - Strip HTML tags
 *  - Remove common ad/tracking phrases
 *  - Collapse duplicate whitespace / blank lines
 *  - Detect language (English vs Marathi/Hindi)
 *  - Normalize title and content
 *
 * Returns: { clean_title, clean_content, language, word_count }
 */

const AD_PHRASES = [
  /advertisement/gi,
  /sponsored content/gi,
  /subscribe\s+now/gi,
  /click\s+here/gi,
  /follow\s+us\s+on/gi,
  /share\s+this\s+article/gi,
  /read\s+more:?/gi,
  /also\s+read:?/gi,
  /related\s+news:?/gi,
  /\[(\.\.\.|…)\]/g,
  /\(adsbygoogle\s*=.*?\)\s*\.push\(\{\}\);/g,
];

/**
 * Remove HTML tags and decode common HTML entities.
 */
function stripHtml(text = "") {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Remove advertising and noise phrases.
 */
function removeAds(text = "") {
  let cleaned = String(text);
  for (const pattern of AD_PHRASES) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned;
}

/**
 * Collapse multiple blank lines/whitespace into single space/newline.
 */
function normalizeWhitespace(text = "") {
  return String(text)
    .replace(/[ \t]+/g, " ")          // multiple spaces/tabs → single space
    .replace(/\n{3,}/g, "\n\n")        // 3+ newlines → double newline
    .trim();
}

/**
 * Basic language detection.
 * Marathi/Hindi use Devanagari script (Unicode 0900–097F).
 * Anything else defaults to English.
 */
function detectLanguage(text = "") {
  const devanagariChars = (String(text).match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = String(text).replace(/\s/g, "").length || 1;
  const ratio = devanagariChars / totalChars;

  if (ratio > 0.3) return "mr"; // Marathi
  if (ratio > 0.1) return "hi"; // Hindi
  return "en";
}

/**
 * Main clean agent function.
 * @param {Object} rawArticle - { title, content }
 * @returns {{ clean_title, clean_content, language, word_count }}
 */
function clean(rawArticle) {
  const rawTitle = rawArticle.title || "";
  const rawContent = rawArticle.content || "";

  // Pipeline: strip HTML → remove ads → normalize whitespace
  const clean_title = normalizeWhitespace(removeAds(stripHtml(rawTitle)));
  const clean_content = normalizeWhitespace(removeAds(stripHtml(rawContent)));

  const language = detectLanguage(clean_content);
  const word_count = clean_content.split(/\s+/).filter(Boolean).length;

  return { clean_title, clean_content, language, word_count };
}

module.exports = { clean };
