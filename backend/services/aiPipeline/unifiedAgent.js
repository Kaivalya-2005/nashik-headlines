/**
 * services/aiPipeline/unifiedAgent.js
 *
 * Single Groq API call that returns STRUCTURED JSON — not HTML.
 * Backend renders HTML from this JSON (see content/htmlRenderer.js).
 *
 * Returns:
 *   title, intro, sections[{heading, paragraphs[]}], conclusion,
 *   focus_keyword, seo_title, meta_description, slug, keywords,
 *   og_title, og_description, twitter_title, twitter_description,
 *   category, tags, excerpt, ai_confidence
 */

const axios = require("axios");
const { MODEL_FULL, chatCompletion } = require("../groqClient");

const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = MODEL_FULL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MAX_RETRIES      = 2;
const RETRY_DELAY_MS   = 3000;

// ── Language detection ────────────────────────────────────────────────────────
function isMarathiContent(title, content) {
  const text = `${title} ${content}`;
  return /[\u0900-\u097F]/.test(text);
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildEnglishPrompt(title, content) {
  return `You are a senior English news journalist and SEO expert for nashikheadlines.com.

Rewrite the following raw article into a professional, structured news story.

RAW TITLE: ${title}
RAW CONTENT: ${String(content).slice(0, 2500)}

MANDATORY SEO RULES (CRITICAL):
1. Output MUST be a valid JSON object — no markdown, no explanation.
2. The article MUST be 600-700 words. Expand heavily with rich context and background information.
3. The "focus_keyword" MUST be exactly 2-4 words.
4. The focus_keyword MUST appear in the FIRST SENTENCE of the "intro".
5. The focus_keyword MUST appear in at least TWO "heading" fields of the sections.
6. The focus_keyword MUST appear 8-12 times in the body content (paragraphs).
7. "seo_title" MUST start exactly with the focus_keyword (max 60 chars).
8. "meta_description" MUST contain the focus_keyword and be EXACTLY 120-155 characters long.
9. "slug" MUST contain all words from the focus_keyword (kebab-case).
10. Include an external outbound link in the paragraphs, e.g., <a href="https://example.com">Source</a>.

Return ONLY this JSON structure:
{
  "title": "Compelling headline (max 70 chars)",
  "intro": "Opening paragraph (2-3 sentences) with focus keyword in the very first sentence",
  "sections": [
    {
      "heading": "Section heading containing focus keyword",
      "paragraphs": ["Paragraph 1 text with focus keyword...", "Paragraph 2 text..."]
    }
  ],
  "conclusion": "Closing paragraph (2-3 sentences)",
  "focus_keyword": "2-4 word primary keyphrase",
  "seo_title": "[INSERT FOCUS KEYWORD HERE]: Compelling SEO Title",
  "meta_description": "Meta description containing the focus keyword. MUST be exactly 2-3 sentences long (strictly between 120 and 155 characters). Do not write short descriptions.",
  "slug": "url-friendly-slug-with-focus-keyword",
  "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "og_title": "Social share title (max 60 chars)",
  "og_description": "Social share description (max 160 chars)",
  "twitter_title": "Twitter card title (max 60 chars)",
  "twitter_description": "Twitter description (max 160 chars)",
  "category": "One of: Local News, Politics, Crime, Sports, Business, Technology, Entertainment, International, Education, Health",
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8",
  "excerpt": "2-3 sentence article excerpt",
  "ai_confidence": 85
}`;
}

function buildMarathiPrompt(title, content) {
  return `तुम्ही navimumbaiheadlines.com साठी व्यावसायिक SEO तज्ञ मराठी पत्रकार आहात.

खालील कच्ची बातमी व्यावसायिक, संरचित मराठी बातमीत रूपांतरित करा.

मूळ शीर्षक: ${title}
मूळ बातमी: ${String(content).slice(0, 2500)}

MANDATORY SEO RULES (CRITICAL):
1. Output MUST be a valid JSON object — no markdown, no explanation.
2. The article MUST be 600-700 words. Expand heavily with rich context and background information.
3. The "focus_keyword" MUST be exactly 2-4 words.
4. The focus_keyword MUST appear in the FIRST SENTENCE of the "intro".
5. The focus_keyword MUST appear in at least TWO "heading" fields of the sections.
6. The focus_keyword MUST appear 8-12 times in the body content (paragraphs).
7. "seo_title" MUST start exactly with the focus_keyword (max 60 chars).
8. "meta_description" MUST contain the focus_keyword and be EXACTLY 120-155 characters long.
9. "slug" MUST contain all words from the focus_keyword (in English/kebab-case).
10. Include an external outbound link in the paragraphs, e.g., <a href="https://example.com">Source</a>.

Return ONLY this JSON structure:
{
  "title": "आकर्षक मराठी शीर्षक (max 70 chars)",
  "intro": "पहिला परिच्छेद — focus keyphrase पहिल्या वाक्यात (2-3 वाक्ये)",
  "sections": [
    {
      "heading": "विभाग शीर्षक - focus keyword",
      "paragraphs": ["परिच्छेद 1...", "परिच्छेद 2..."]
    }
  ],
  "conclusion": "शेवटचा परिच्छेद (2-3 वाक्ये)",
  "focus_keyword": "2-4 शब्दांचे keyphrase",
  "seo_title": "[INSERT FOCUS KEYWORD HERE]: SEO शीर्षक (max 60 chars)",
  "meta_description": "Meta description focus keyphrase सह (MUST be exactly 2-3 sentences long to hit the strict 120-155 character requirement)",
  "slug": "url-friendly-english-slug",
  "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "og_title": "Social share शीर्षक (max 60 chars)",
  "og_description": "Social share वर्णन (max 160 chars)",
  "twitter_title": "Twitter card शीर्षक (max 60 chars)",
  "twitter_description": "Twitter वर्णन (max 160 chars)",
  "category": "One of: Maharashtra, Navi Mumbai, India, Politics, Crime, Sports, Business, Technology, Entertainment, Education, Health",
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10",
  "excerpt": "2-3 वाक्यांचा excerpt",
  "ai_confidence": 85
}`;
}

// ── Safe JSON extraction ──────────────────────────────────────────────────────

function extractJson(rawText) {
  // Strip markdown fences
  let text = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1");

  // Extract outermost { ... }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");

  let jsonStr = match[0];

  // Escape bare control characters inside JSON string values
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escaped)     { result += ch; escaped = false; continue; }
    if (ch === "\\") { result += ch; escaped = true;  continue; }
    if (ch === '"')  { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      if (ch.charCodeAt(0) < 0x20) { continue; }
    }
    result += ch;
  }

  return JSON.parse(result);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateArticleJson(data) {
  if (!data.title)    throw new Error("Missing title in AI JSON");
  if (!data.intro)    throw new Error("Missing intro in AI JSON");
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error("Missing or empty sections array in AI JSON");
  }
  for (const s of data.sections) {
    if (!s.heading) throw new Error("Section missing heading");
    if (!Array.isArray(s.paragraphs) || s.paragraphs.length === 0) {
      throw new Error("Section missing paragraphs");
    }
  }
  return true;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Process raw article via single Groq call → structured JSON.
 *
 * @param {string} title   - Raw/cleaned article title
 * @param {string} content - Raw/cleaned article content
 * @param {object} opts    - { language, publish_to } optional overrides
 * @returns {object} Structured article JSON
 */
async function processAllInOne(title, content, opts = {}) {
  const isMarathi = opts.language === "mr" ||
                    opts.publish_to === "navimumbai" ||
                    isMarathiContent(title, content);

  const prompt = isMarathi
    ? buildMarathiPrompt(title, content)
    : buildEnglishPrompt(title, content);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await chatCompletion({
        prompt,
        maxTokens: 1400,
        jsonFormat: true,
      });
      const data = extractJson(raw);
      validateArticleJson(data);

      // Ensure defaults
      data.ai_confidence = Math.max(0, Math.min(100, data.ai_confidence || 75));
      data.category      = data.category || "Local News";
      data.slug          = data.slug || "";
      data.focus_keyword = data.focus_keyword || "";
      data.seo_title     = data.seo_title || data.title;
      data.meta_description = data.meta_description || "";
      data.conclusion    = data.conclusion || "";

      console.log(`[UnifiedAgent] ✅ Structured JSON received — ${data.sections.length} sections, kw: "${data.focus_keyword}"`);
      return data;

    } catch (err) {
      lastError = err;
      const is429 = err?.response?.status === 429;
      console.warn(`[UnifiedAgent] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = is429 ? 15000 : RETRY_DELAY_MS * attempt;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`UnifiedAgent failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

module.exports = { processAllInOne, isMarathiContent };
