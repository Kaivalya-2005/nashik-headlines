/**
 * improveAgent.js
 * ---------------
 * Uses Ollama / Mistral to rewrite an existing article, improving its
 * readability, structure, and SEO without changing facts.
 *
 * Rules:
 *  - Keep all facts unchanged
 *  - Target length: 500-700 words
 *  - Professional, active-voice, unbiased tone
 *  - Returns valid JSON.
 */

const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function buildImprovePrompt(title, content) {
  return `
You are a senior editor for "Nashik Headlines", a trusted local news website in Maharashtra, India.

Your task is to significantly improve the quality of the following article while STRICTLY maintaining all core facts.

FOCUS ON:
- Clearer structure and better flow.
- Shorter, more readable paragraphs.
- Improved, compelling headline.
- Stronger SEO keywords integration naturally.
- Better overall readability (Target: Readability Score > 50).
- Professional, journalistic tone (Target: AI Confidence > 70).

STRICT RULES:
- Do NOT invent or add any new facts.
- Keep all facts, names, dates, and figures exactly as given.
- Write in third-person, active voice.
- Target length: 500 to 700 words.
- Include a max 2-sentence lead paragraph summarizing the who/what/when/where.

Return ONLY valid JSON — no markdown, no extra text. Format:
{
  "improved_title": "Compelling improved headline (max 70 chars)",
  "improved_content": "Full improved article body (500-700 words)"
}

CURRENT TITLE:
${title}

CURRENT CONTENT:
${content}
`.trim();
}

/**
 * Parse JSON from Mistral response, handling markdown code fences.
 */
function parseJsonResponse(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : text;
  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error("No JSON object found in AI response");
  return JSON.parse(objMatch[0]);
}

/**
 * Similarity check helper
 * Basic check comparing overlapping words to ensure we don't just echo back or wildly change text
 */
function checkSimilarity(oldContent, newContent) {
  const getWords = (text) => text.toLowerCase().split(/\s+/).filter(Boolean);
  const m1 = getWords(oldContent);
  const m2 = getWords(newContent);
  
  if (m1.length === 0 || m2.length === 0) return 0;
  
  const set1 = new Set(m1);
  let intersection = 0;
  for (const w of m2) {
    if (set1.has(w)) intersection++;
  }
  
  // Return percentage of old words that are still in new words (rough similarity)
  return intersection / m1.length;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Improve agent main function.
 * @param {string} title
 * @param {string} content
 * @returns {{ improved_title, improved_content, isSimilar }}
 */
async function improve(title, content) {
  const prompt = buildImprovePrompt(title, content);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 150000 
        }
      );

      const text = response.data?.choices?.[0]?.message?.content || "";
      const parsed = parseJsonResponse(text);

      if (!parsed.improved_title || !parsed.improved_content) {
        throw new Error("AI response missing required fields");
      }

      const improved_title = String(parsed.improved_title).trim();
      const improved_content = String(parsed.improved_content).trim();

      const similarityRaw = checkSimilarity(content, improved_content);
      const isSimilar = similarityRaw > 0.90; // > 90% similarly == no significant improvement

      return {
        improved_title,
        improved_content,
        isSimilar
      };

    } catch (err) {
      lastError = err;
      console.warn(`⚠️  improveAgent attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error(`Failed to improve article after max retries: ${lastError?.message}`);
}

module.exports = { improve, checkSimilarity };
