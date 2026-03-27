/**
 * seoAgent.js
 * -----------
 * Generates SEO metadata for a processed article using Ollama/Mistral,
 * then runs it through the existing seo.js scoring library.
 *
 * Returns:
 *  seo_title        (max 55 chars)
 *  meta_description (max 155 chars)
 *  keywords         (comma-separated string)
 *  slug             (URL-friendly)
 *  seo_score        (0–100)
 */

const axios = require("axios");
const { slugify, buildSeoPayload } = require("../seo");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

/**
 * Build the SEO prompt — keeps it concise to get fast, clean output.
 */
function buildPrompt(title, content) {
  const snippet = `${title}\n\n${content}`.slice(0, 1000);
  return `
You are an SEO expert for "Nashik Headlines", a news website in Nashik, Maharashtra, India.

Generate SEO metadata for this news article.

Constraints:
- seo_title: max 55 characters. Must include a primary keyword.
- meta_description: max 155 characters. Summarizes the article and encourages clicks.
- keywords: 5 to 8 comma-separated keywords relevant to the article.

Return ONLY valid JSON — no markdown, no extra text:
{
  "seo_title": "",
  "meta_description": "",
  "keywords": ""
}

Article:
${snippet}
`.trim();
}

/**
 * Parse JSON response from AI, handling markdown fences.
 */
function parseJsonResponse(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : text;
  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error("No JSON found in SEO agent response");
  return JSON.parse(objMatch[0]);
}

/**
 * Truncate a string to a max length, trimming at the last word boundary.
 */
function truncate(str, max) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "").trim();
}

/**
 * SEO agent main function.
 * @param {string} title  - Rewritten article title
 * @param {string} content - Rewritten article content
 * @param {string} category
 * @returns {{ seo_title, meta_description, keywords, slug, seo_score }}
 */
async function generateSeo(title, content, category = "") {
  let aiSeoTitle = "";
  let aiMetaDesc = "";
  let aiKeywords = "";

  // ── Attempt AI SEO generation ─────────────────────────────────────────
  try {
    const response = await axios.post(
      OLLAMA_URL,
      { model: OLLAMA_MODEL, prompt: buildPrompt(title, content), stream: false },
      { timeout: 60000 }
    );
    const text = response.data?.response || "";
    const parsed = parseJsonResponse(text);
    aiSeoTitle = parsed.seo_title || "";
    aiMetaDesc = parsed.meta_description || "";
    aiKeywords = parsed.keywords || "";
  } catch (err) {
    console.warn("⚠️  seoAgent: AI call failed, using heuristic SEO:", err.message);
  }

  // ── Enforce length limits ─────────────────────────────────────────────
  const seo_title = truncate(aiSeoTitle || title, 55);
  const meta_description = truncate(aiMetaDesc, 155);
  const keywords_raw = aiKeywords || `${category}, nashik news, maharashtra, local news`;
  const slug = slugify(seo_title || title);

  // ── Run through existing SEO scorer for accurate score ────────────────
  const payload = buildSeoPayload({
    title,
    content,
    seo_title,
    meta_description,
    slug,
    keywords: keywords_raw,
  });

  return {
    seo_title: payload.seo_title,
    meta_description: payload.meta_description,
    keywords: payload.keywords,
    slug: payload.slug,
    seo_score: payload.seo_score,
  };
}

module.exports = { generateSeo };
