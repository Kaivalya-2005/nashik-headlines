/**
 * seoAgent.js
 * -----------
 * Generates SEO metadata for a processed article using Groq/Llama,
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

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RATE_LIMIT_PENALTY_MS = 15000; // 15 seconds on 429

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
- IMPORTANT: Escape all newlines within JSON string values as \\n. Do NOT include raw newlines inside JSON strings.

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
 * Parse and sanitize JSON response from AI.
 * Strips markdown fences and escapes bare control characters inside
 * JSON string values before calling JSON.parse — prevents the
 * "Bad control character in string literal" SyntaxError from Groq responses.
 */
function sanitizeJsonText(rawText) {
  // Strip markdown fences
  let text = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1');

  // Extract outermost { ... } block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    console.error('[seoAgent] No JSON object found. Raw (first 500):\n', rawText.slice(0, 500));
    throw new Error('No JSON found in SEO agent response');
  }

  let jsonStr = objMatch[0];

  // Walk the string and escape bare control chars inside quoted values
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escaped)          { result += ch; escaped = false; continue; }
    if (ch === '\\')      { result += ch; escaped = true;  continue; }
    if (ch === '"')       { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === '\n')               { result += '\\n'; continue; }
      if (ch === '\r')               { result += '\\r'; continue; }
      if (ch === '\t')               { result += '\\t'; continue; }
      if (ch.charCodeAt(0) < 0x20)  { continue; } // drop other control chars
    }
    result += ch;
  }

  try {
    return JSON.parse(result);
  } catch (err) {
    console.error('[seoAgent] JSON.parse failed after sanitization:', err.message);
    console.error('[seoAgent] Sanitized (first 500):\n', result.slice(0, 500));
    throw new Error(`SEO agent JSON parse error: ${err.message}`);
  }
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
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: buildPrompt(title, content) }],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );
    const text = response.data?.choices?.[0]?.message?.content || "";
    const parsed = sanitizeJsonText(text);
    aiSeoTitle = parsed.seo_title || "";
    aiMetaDesc = parsed.meta_description || "";
    aiKeywords = parsed.keywords || "";
  } catch (err) {
    const is429 = err?.response?.status === 429;
    if (is429) {
      console.warn(`⏳ seoAgent: Rate limited — waiting ${RATE_LIMIT_PENALTY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_PENALTY_MS));
    }
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
