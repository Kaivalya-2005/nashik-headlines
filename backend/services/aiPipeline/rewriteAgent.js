/**
 * rewriteAgent.js
 * ---------------
 * Uses Ollama / Mistral to rewrite cleaned content as a professional
 * journalistic news article.
 *
 * Rules:
 *  - Keep all facts unchanged
 *  - 400–600 words
 *  - Professional, active-voice, unbiased tone
 *  - No plagiarism-prone phrasing
 *  - Return strict JSON
 *
 * Returns: { rewritten_title, rewritten_content }
 */

const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Build the rewrite prompt for Mistral.
 */
function buildPrompt(clean_title, clean_content) {
  return `
You are a senior news journalist for "Nashik Headlines", a trusted local news website in Maharashtra, India.

Your task is to professionally rewrite the following scraped article into a clean, original news story.

STRICT RULES:
- Do NOT invent or add any new facts.
- Keep all facts, names, dates, and figures exactly as given.
- Write in third-person, professional journalistic tone.
- Use active voice and short, clear paragraphs.
- Do NOT use phrases like "According to reports", "It is said that", "Sources say".
- Target length: 400 to 600 words.
- Include a max 2-sentence lead paragraph summarizing the who/what/when/where.

Return ONLY valid JSON — no markdown, no extra text. Format:
{
  "rewritten_title": "Compelling news headline (max 70 chars)",
  "rewritten_content": "Full rewritten article body (400-600 words)"
}

ORIGINAL TITLE:
${clean_title}

ORIGINAL CONTENT:
${clean_content}
`.trim();
}

/**
 * Parse JSON from Mistral response, handling markdown code fences.
 */
function parseJsonResponse(text) {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : text;

  // Find the first {...} block
  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error("No JSON object found in AI response");

  return JSON.parse(objMatch[0]);
}

/**
 * Sleep helper for retry back-off.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rewrite agent main function.
 * @param {string} clean_title
 * @param {string} clean_content
 * @returns {{ rewritten_title, rewritten_content }}
 */
async function rewrite(clean_title, clean_content) {
  const prompt = buildPrompt(clean_title, clean_content);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        OLLAMA_URL,
        { model: OLLAMA_MODEL, prompt, stream: false },
        { timeout: 120000 } // 2-minute timeout per call
      );

      const text = response.data?.response || "";
      const parsed = parseJsonResponse(text);

      if (!parsed.rewritten_title || !parsed.rewritten_content) {
        throw new Error("AI response missing required fields");
      }

      return {
        rewritten_title: String(parsed.rewritten_title).trim(),
        rewritten_content: String(parsed.rewritten_content).trim(),
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  rewriteAgent attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  // Graceful fallback — return cleaned content as-is
  console.error("❌ rewriteAgent: all retries exhausted, using fallback.");
  return {
    rewritten_title: clean_title,
    rewritten_content: clean_content,
  };
}

module.exports = { rewrite };
