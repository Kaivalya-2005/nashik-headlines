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
- Keep EVERY single sentence under 18 words to maximize readability score.
- Break content into 4 or more short paragraphs.
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
 * Sanitize an AI text response and extract the first valid JSON object.
 *
 * Steps:
 *  1. Strip markdown code fences (```json ... ```)
 *  2. Extract the outermost { ... } block
 *  3. Replace bare control characters (tabs, newlines, carriage-returns)
 *     that appear INSIDE JSON string values with their escaped equivalents.
 *     Raw newlines inside a JSON string value are illegal per spec and are
 *     the root cause of the "Bad control character" SyntaxErrors from Groq.
 *  4. Call JSON.parse on the cleaned string.
 *
 * Logs the raw text for debugging if parsing ultimately fails.
 */
function sanitizeAndParseJson(rawText) {
  // 1. Strip markdown fences
  const fenceMatch = rawText.match(/```(?:json)?[\s\S]*?```/);
  let text = fenceMatch
    ? rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1')
    : rawText;

  // 2. Extract outermost { ... } block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    console.error('[improveAgent] No JSON object found in AI response. Raw text:\n', rawText.slice(0, 500));
    throw new Error('No JSON object found in AI response');
  }

  let jsonStr = objMatch[0];

  // 3. Replace illegal bare control characters inside JSON string values.
  //    We walk through the string tracking whether we are inside a quoted
  //    string so we only touch characters that would break the parser.
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Replace control characters that are illegal inside JSON strings
      if (ch === '\n')      { result += '\\n';  continue; }
      if (ch === '\r')      { result += '\\r';  continue; }
      if (ch === '\t')      { result += '\\t';  continue; }
      if (ch.charCodeAt(0) < 0x20) { continue; } // drop other control chars
    }

    result += ch;
  }

  // 4. Parse
  try {
    return JSON.parse(result);
  } catch (parseErr) {
    console.error('[improveAgent] JSON.parse failed after sanitization:', parseErr.message);
    console.error('[improveAgent] Sanitized string (first 500 chars):\n', result.slice(0, 500));
    throw new Error(`JSON parse error after sanitization: ${parseErr.message}`);
  }
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
      const parsed = sanitizeAndParseJson(text);

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
