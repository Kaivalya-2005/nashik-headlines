/**
 * categoryAgent.js
 * ----------------
 * Classifies the article into a predefined news category.
 *
 * Strategy:
 *  1. Try AI classification via Ollama/Mistral (fast, one-word response).
 *  2. Fall back to keyword-based heuristic if AI fails.
 *
 * Possible categories:
 *  Politics | Crime | Technology | Sports | Business |
 *  Entertainment | Local News | International
 *
 * Returns: { category }
 */

const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

const VALID_CATEGORIES = [
  "Politics",
  "Crime",
  "Technology",
  "Sports",
  "Business",
  "Entertainment",
  "Local News",
  "International",
];

/**
 * Keyword → category fallback map (checked in order).
 */
const KEYWORD_MAP = [
  { keywords: ["election", "minister", "government", "party", "vote", "mp", "mla", "bjp", "congress", "ncp", "shiv sena", "political"], category: "Politics" },
  { keywords: ["murder", "theft", "arrested", "police", "crime", "robbery", "fraud", "accused", "fir", "custody", "violence"], category: "Crime" },
  { keywords: ["ipl", "cricket", "football", "sport", "match", "tournament", "athlete", "gold medal", "olympic", "stadium", "player"], category: "Sports" },
  { keywords: ["startup", "stock", "market", "economy", "business", "company", "investment", "revenue", "profit", "ipo", "trade"], category: "Business" },
  { keywords: ["ai", "artificial intelligence", "tech", "software", "app", "mobile", "internet", "cyber", "data", "digital", "robot"], category: "Technology" },
  { keywords: ["bollywood", "movie", "film", "actor", "actress", "singer", "music", "celebrity", "award", "entertainment", "ott"], category: "Entertainment" },
  { keywords: ["usa", "china", "pakistan", "russia", "uk", "europe", "global", "world", "international", "united nations", "foreign"], category: "International" },
  { keywords: ["nashik", "maharashtra", "pune", "mumbai", "local", "district", "municipal", "ward", "village", "taluka"], category: "Local News" },
];

/**
 * AI-based category classification.
 */
async function classifyWithAI(title, content) {
  const snippet = `${title}\n\n${content}`.slice(0, 800); // keep prompt small
  const prompt = `
You are a news editor. Classify this news article into exactly ONE of these categories:
Politics, Crime, Technology, Sports, Business, Entertainment, Local News, International

Respond with ONLY the category name — no explanation, no punctuation.

Article:
${snippet}
`.trim();

  const response = await axios.post(
    OLLAMA_URL,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: 30000 }
  );

  const raw = String(response.data?.response || "").trim();
  // Find which valid category matches the response (case-insensitive)
  const matched = VALID_CATEGORIES.find(
    (cat) => raw.toLowerCase().includes(cat.toLowerCase())
  );
  return matched || null;
}

/**
 * Keyword-based fallback classifier.
 */
function classifyWithKeywords(title, content) {
  const text = `${title} ${content}`.toLowerCase();
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "Local News"; // default
}

/**
 * Category agent main function.
 * @param {string} title
 * @param {string} content
 * @returns {{ category: string }}
 */
async function categorize(title, content) {
  try {
    const aiCategory = await classifyWithAI(title, content);
    if (aiCategory) {
      return { category: aiCategory };
    }
    console.warn("⚠️  categoryAgent: AI returned ambiguous result, using keyword fallback.");
  } catch (err) {
    console.warn("⚠️  categoryAgent: AI call failed, using keyword fallback:", err.message);
  }

  return { category: classifyWithKeywords(title, content) };
}

module.exports = { categorize };
