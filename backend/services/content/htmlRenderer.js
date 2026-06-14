/**
 * services/content/htmlRenderer.js
 *
 * Pure JS module — converts structured article JSON into clean,
 * FULL WordPress Gutenberg-native blocks.
 *
 * ZERO AI calls. Deterministic output every time.
 */

// ── Build Gutenberg Blocks ───────────────────────────────────────────────────

function buildParagraphBlock(text) {
  if (!text || !text.trim()) return "";
  return `<!-- wp:paragraph -->\n<p>${text.trim()}</p>\n<!-- /wp:paragraph -->\n\n`;
}

function buildHeadingBlock(text, level = 2) {
  if (!text || !text.trim()) return "";
  const attrs = level !== 2 ? ` {"level":${level}}` : "";
  return `<!-- wp:heading${attrs} -->\n<h${level}>${text.trim()}</h${level}>\n<!-- /wp:heading -->\n\n`;
}

function buildListBlock(items, ordered = false) {
  if (!items || !Array.isArray(items) || items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  let html = `<!-- wp:list -->\n<${tag}>\n`;
  for (const item of items) {
    if (item && item.trim()) {
      html += `<li>${item.trim()}</li>\n`;
    }
  }
  html += `</${tag}>\n<!-- /wp:list -->\n\n`;
  return html;
}

function buildImageBlock(img, size = "large") {
  if (!img || !img.url) return "";

  const safeAlt = String(img.altText || img.alt_text || "").replace(/"/g, "&quot;").trim();
  const safeCap = String(img.caption || "").trim();
  const safeSrc = String(img.url).trim();
  const mediaClass = img.mediaId ? ` wp-image-${img.mediaId}` : "";

  const captionHtml = safeCap
    ? `\n  <figcaption>${safeCap}</figcaption>`
    : "";

  return (
    `<!-- wp:image {"sizeSlug":"${size}"} -->\n` +
    `<figure class="wp-block-image size-${size}">` +
    `\n  <img\n    src="${safeSrc}"\n    alt="${safeAlt}"\n    class="${mediaClass.trim()}"\n  />` +
    `${captionHtml}\n` +
    `</figure>\n` +
    `<!-- /wp:image -->\n\n`
  );
}

// ── Fallback SEO and Utilities ───────────────────────────────────────────────

function generateImageSeo(title, focusKeyword, isMarathi) {
  const kw = (focusKeyword || title || "").trim();
  if (isMarathi) {
    return {
      altText:  `${kw} - महाराष्ट्रातील ताज्या बातम्या`.slice(0, 120),
      caption:  `${kw} संदर्भातील बातमी`.slice(0, 80),
    };
  }
  return {
    altText:  `${kw} - Latest News from Nashik, Maharashtra`.slice(0, 120),
    caption:  `${kw} coverage by Nashik Headlines`.slice(0, 80),
  };
}

function countWords(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function isMarathiText(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

// ── Main renderer ─────────────────────────────────────────────────────────────

/**
 * Render structured article JSON into FULL Gutenberg HTML.
 *
 * @param {object} articleJson - Structured JSON from unifiedAgent
 * @param {object[]} images    - Uploaded image objects
 * @param {object}   opts      - { siteUrl, sourceUrl, isMarathi }
 * @returns {string}           - Clean Gutenberg HTML string
 */
function renderArticleHtml(articleJson, images = [], opts = {}) {
  const {
    siteUrl   = "nashikheadlines.com",
    sourceUrl = "https://pib.gov.in",
    isMarathi = false,
  } = opts;

  const sections = articleJson.sections || [];
  let html = "";
  let imageIndex = 0;

  // 1. Intro paragraph
  if (articleJson.intro) {
    html += buildParagraphBlock(articleJson.intro);
  }

  // 2. Sections: heading + paragraphs/lists + image after each section
  for (const section of sections) {
    // Heading
    if (section.heading) {
      html += buildHeadingBlock(section.heading, 2);
    }

    // Paragraphs or lists
    if (Array.isArray(section.paragraphs)) {
      for (const para of section.paragraphs) {
        if (para && para.trim()) {
          // Naive check if it looks like a list array was accidentally passed as a string
          if (para.startsWith("- ") || para.startsWith("* ")) {
            const listItems = para.split(/\n/).map(line => line.replace(/^[-*]\s+/, ""));
            html += buildListBlock(listItems);
          } else {
            html += buildParagraphBlock(para);
          }
        }
      }
    }

    // Optional native list support if AI outputs "lists" array
    if (Array.isArray(section.lists)) {
      html += buildListBlock(section.lists);
    }

    // Inject image after this section (deterministic, one per section)
    if (images[imageIndex]) {
      html += buildImageBlock(images[imageIndex]);
      imageIndex++;
    }
  }

  // 3. Conclusion paragraph
  if (articleJson.conclusion) {
    html += buildParagraphBlock(articleJson.conclusion);
  }

  // 4. Outbound + internal links
  if (isMarathi) {
    html += buildParagraphBlock(`अधिक माहितीसाठी <a href="${sourceUrl}" target="_blank" rel="noopener">अधिकृत स्रोत येथे पहा</a>. <a href="https://${siteUrl}/related-news">संबंधित बातम्या येथे वाचा</a>.`);
  } else {
    html += buildParagraphBlock(`For more details, visit the <a href="${sourceUrl}" target="_blank" rel="noopener">official source</a>. <a href="https://${siteUrl}/related-news">Read more news on Nashik Headlines</a>.`);
  }

  // 5. Remaining images (if more images than sections)
  while (imageIndex < images.length) {
    html += buildImageBlock(images[imageIndex]);
    imageIndex++;
  }

  return html.trim();
}

/**
 * Insert uploaded images into existing HTML (AI Editor path — no structured JSON).
 * Places images after </h2> breaks when present, otherwise after </p> paragraphs.
 */
function injectImagesIntoHtml(htmlContent, images = []) {
  const imgs = (images || []).filter((i) => i?.url);
  if (!imgs.length) return String(htmlContent || "").trim();

  let html = String(htmlContent || "").trim();
  const blocks = imgs.map((img) => buildImageBlock(img));

  const anchors = [];
  const h2End = /<\/h2>/gi;
  let m;
  while ((m = h2End.exec(html)) !== null) {
    anchors.push(m.index + 5);
  }
  if (!anchors.length) {
    const pEnd = /<\/p>/gi;
    while ((m = pEnd.exec(html)) !== null) {
      anchors.push(m.index + 4);
    }
  }
  if (!anchors.length) {
    return `${html}\n\n${blocks.join("\n\n")}`.trim();
  }

  const insertions = [];
  for (let i = 0; i < blocks.length; i++) {
    const anchorIdx = Math.min(
      anchors.length - 1,
      Math.max(0, Math.floor(((i + 1) * anchors.length) / (blocks.length + 1)) - 1)
    );
    insertions.push({ pos: anchors[anchorIdx], block: blocks[i] });
  }

  const byPos = new Map();
  for (const { pos, block } of insertions) {
    byPos.set(pos, (byPos.get(pos) || "") + block);
  }

  const sorted = [...byPos.entries()].sort((a, b) => b[0] - a[0]);
  for (const [pos, block] of sorted) {
    html = html.slice(0, pos) + "\n\n" + block + html.slice(pos);
  }
  return html.trim();
}

module.exports = {
  renderArticleHtml,
  injectImagesIntoHtml,
  buildImageBlock,
  buildParagraphBlock,
  buildHeadingBlock,
  buildListBlock,
  generateImageSeo,
  countWords,
  isMarathiText,
};
