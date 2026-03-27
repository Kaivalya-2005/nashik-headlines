/**
 * qualityAgent.js
 * ---------------
 * Evaluates the generated article and returns a quality report.
 *
 * Checks (pure JS — fast, no extra deps):
 *  1. Content Length         — 300–700 word target
 *  2. Readability Score      — avg sentence length + paragraph structure
 *  3. Clickbait Detection    — title exaggeration patterns
 *  4. Repetition Detection   — duplicate sentence ratio
 *
 * AI check (Ollama — optional, non-blocking):
 *  5. AI Confidence Score    — Mistral rates overall article quality (0–100)
 *
 * Returns:
 *  { readability_score, ai_confidence, content_length, warnings[] }
 */

const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

// ── 1. Content Length ─────────────────────────────────────────────────────────

function checkContentLength(content) {
  const words = String(content).split(/\s+/).filter(Boolean);
  return { word_count: words.length, ok: words.length >= 300 && words.length <= 700 };
}

// ── 2. Readability Score (0–100) ─────────────────────────────────────────────
// Based on avg words-per-sentence and paragraph count.
// Shorter sentences + multiple paragraphs = more readable.

function calcReadability(content) {
  const text = String(content).trim();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 4);
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);

  if (sentences.length === 0) return 0;

  const avgWordsPerSentence = words.length / sentences.length;
  const paragraphCount = paragraphs.length;

  // Score penalties for long sentences, bonus for multiple paragraphs
  let score = 100;

  // Penalty: sentences > 25 words are hard to read
  if (avgWordsPerSentence > 35) score -= 35;
  else if (avgWordsPerSentence > 25) score -= 20;
  else if (avgWordsPerSentence > 18) score -= 8;

  // Penalty: wall-of-text (single paragraph)
  if (paragraphCount === 1) score -= 20;
  else if (paragraphCount < 3) score -= 10;

  // Bonus: well-structured content
  if (paragraphCount >= 4) score += 5;

  // Penalty: very short content
  if (words.length < 200) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── 3. Clickbait Detection ────────────────────────────────────────────────────

const CLICKBAIT_PATTERNS = [
  /\byou won't believe\b/i,
  /\bshocking\b.*\btruth\b/i,
  /\bthis one trick\b/i,
  /\bjaw.?dropping\b/i,
  /\bmind.?blowing\b/i,
  /\bbreaking.{0,10}news\b/i,
  /[!]{2,}/,                       // multiple exclamation marks
  /\b(URGENT|EXCLUSIVE|BOMBSHELL)\b/,
  /\beveryone is talking about\b/i,
  /\bviral\b.{0,20}\bsensation\b/i,
];

function detectClickbait(title) {
  const warnings = [];
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(String(title))) {
      warnings.push(`Clickbait pattern detected in title: "${pattern.source}"`);
      break; // one warning is enough
    }
  }
  return warnings;
}

// ── 4. Repetition Detection ───────────────────────────────────────────────────
// Flag if > 15% of sentences appear more than once.

function detectRepetition(content) {
  const warnings = [];
  const sentences = String(content)
    .split(/[.!?]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) return warnings;

  const seen = new Map();
  for (const s of sentences) seen.set(s, (seen.get(s) || 0) + 1);
  const dupes = [...seen.values()].filter((count) => count > 1).length;
  const ratio = dupes / sentences.length;

  if (ratio > 0.15) {
    warnings.push(`Repetitive content detected (${Math.round(ratio * 100)}% duplicate sentences)`);
  }
  return warnings;
}

// ── 5. AI Confidence Score (Ollama — non-blocking) ───────────────────────────

async function getAiConfidence(title, content) {
  const snippet = `${title}\n\n${content}`.slice(0, 800);
  const prompt = `
You are a news quality auditor. Rate this news article's overall quality from 0 to 100.

Criteria:
- Factual clarity
- Professional journalistic tone
- Logical flow and coherence
- Grammar and writing quality
- Appropriateness for a news website

Respond with ONLY a single integer number between 0 and 100. No explanation.

Article:
${snippet}
`.trim();

  const response = await axios.post(
    OLLAMA_URL,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: 30000 }
  );

  const raw = String(response.data?.response || "").trim();
  const match = raw.match(/\d+/);
  if (!match) throw new Error("No integer found in AI confidence response");
  return Math.max(0, Math.min(100, parseInt(match[0], 10)));
}

// ── Main Quality Agent ────────────────────────────────────────────────────────

/**
 * Run all quality checks on the rewritten article.
 * AI confidence is fetched in parallel with synchronous checks.
 *
 * @param {string} title   - Rewritten article title
 * @param {string} content - Rewritten article content
 * @returns {{ readability_score, ai_confidence, content_length, warnings[] }}
 */
async function checkQuality(title, content) {
  const warnings = [];

  // Run sync checks immediately
  const { word_count, ok: lengthOk } = checkContentLength(content);
  const readability_score = calcReadability(content);
  const clickbaitWarnings = detectClickbait(title);
  const repetitionWarnings = detectRepetition(content);

  warnings.push(...clickbaitWarnings, ...repetitionWarnings);

  if (!lengthOk) {
    if (word_count < 300) warnings.push(`Content too short: ${word_count} words (min 300)`);
    if (word_count > 700) warnings.push(`Content too long: ${word_count} words (max 700)`);
  }

  if (readability_score < 40) {
    warnings.push(`Low readability score: ${readability_score}/100 — consider shorter sentences`);
  }

  // AI confidence — run in parallel, fallback to 70 on failure
  let ai_confidence = 70; // sensible default
  try {
    ai_confidence = await getAiConfidence(title, content);
  } catch (err) {
    warnings.push(`AI confidence check skipped: ${err.message}`);
    console.warn("⚠️  qualityAgent: AI confidence check failed:", err.message);
  }

  return {
    readability_score,
    ai_confidence,
    content_length: word_count,
    warnings,
  };
}

module.exports = { checkQuality };
